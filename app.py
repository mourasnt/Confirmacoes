from flask import Flask, render_template, request, flash, redirect, url_for, session, jsonify
import pandas as pd
from dotenv import load_dotenv
from google_sheets import GoogleSheetsReader
from mensagem_sender import MensagemSender
from database import Database
import threading
import requests
import os
# IMPORTANTE: Necessário para o Kong/Proxy Reverso
from werkzeug.middleware.proxy_fix import ProxyFix 

# Carrega variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta_aqui_123'  # Mude para uma chave segura

# --- CONFIGURAÇÃO PARA KONG / PROXY REVERSO ---
# Isso faz o Flask entender que está em HTTPS e qual o prefixo da URL
app.wsgi_app = ProxyFix(
    app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
)

# Configure o SCRIPT_NAME para /whatsapp se estiver atrás do Kong
os.environ.setdefault('SCRIPT_NAME', '/whatsapp')
# ----------------------------------------------

# Instância global do banco
db = Database()

# Flag global para indicar envio em andamento
envio_em_andamento = False
envio_lock = threading.Lock()

def fetch_instancias_evolution():
    try:
        evolution_url = db.obter_configuracao('evolution_api_url', 'http://evolution_api:8080')
        url = f"{evolution_url}/instance/fetchInstances"
        response = requests.get(url, timeout=10, headers = {"Content-Type": "application/json", "apikey": db.obter_configuracao('evolution_api_key', 'Senh@Segura123')})
        response.raise_for_status()
        data = response.json()

        # Filtra apenas instâncias abertas
        instancias = [
            {
                "id": i["id"],
                "name": i["name"],
                "status": i["connectionStatus"],
                "profileName": i.get("profileName", ""),
                "number": i.get("number", ""),
                "token": i.get("token", "")
            }
            for i in data
            if i["name"] != "Spots"
        ]

        return instancias
    except Exception as e:
        print(f"Erro ao buscar instâncias: {e}")
        return []

def carregar_dados_automatico(data_inicio=None, data_fim=None):
    try:
        spreadsheet_id = db.obter_configuracao('google_spreadsheet_id')
        sheet_name = db.obter_configuracao('google_sheet_name', 'SHOPEE')
        header_row = int(db.obter_configuracao('google_header_row', '3'))
        linha_inicio_dados = db.obter_configuracao('linha_inicio_dados', None)
        
        if linha_inicio_dados:
            try:
                linha_inicio_dados = int(linha_inicio_dados)
            except ValueError:
                linha_inicio_dados = None

        mapeamento_colunas = {
            'ID 3ZX': db.obter_configuracao('coluna_id', 'ID 3ZX'),
            'Cliente': db.obter_configuracao('coluna_cliente', 'Cliente'),
            'Origem': db.obter_configuracao('coluna_origem', 'Origem'),
            'Destino': db.obter_configuracao('coluna_destino', 'Destino'),
            'ETA Origem': db.obter_configuracao('coluna_eta', 'ETA Origem'),
            'Motorista': db.obter_configuracao('coluna_motorista', 'Motorista'),
            'Telefone': db.obter_configuracao('coluna_telefone', 'Telefone'),
            'Placa': db.obter_configuracao('coluna_placa', 'Placa'),
            'LT': db.obter_configuracao('coluna_lt', 'N° Carga')
        }
        
        if not spreadsheet_id:
            print("⚠️ GOOGLE_SPREADSHEET_ID não configurado")
            return pd.DataFrame()
        
        sheets_reader = GoogleSheetsReader(spreadsheet_id)
        dados = sheets_reader.obter_dados_confirmacao(
            sheet_name,
            linha_cabecalho=header_row,
            linha_inicio_dados=linha_inicio_dados,
            mapeamento_colunas=mapeamento_colunas,
            data_inicio=data_inicio,
            data_fim=data_fim
        )
        
        return dados
        
    except Exception as e:
        print(f"❌ Erro ao carregar dados: {e}")
        return pd.DataFrame()

@app.route('/health')
def health():
    return jsonify({"status": "ok", "service": "whatsapp-confirmacoes"}), 200

@app.route('/api/instancias', methods=['GET'])
def listar_instancias():
    instancias = fetch_instancias_evolution()
    return jsonify(instancias)

@app.route('/api/criar-instancia', methods=['POST'])
def criar_instancia():
    try:
        instancia_name = request.json.get('instancia', '').strip()
        numero = request.json.get('numero', '').strip()
        if not instancia_name:
            return jsonify({'success': False, 'error': 'Nome da instância não fornecido'}), 400
        
        evolution_url = db.obter_configuracao('evolution_api_url', 'http://evolution_api:8080')
        url = f"{evolution_url}/instance/create"
        payload = {
            "instanceName": instancia_name,
            "qrcode": True,
            "number": numero,
            "integration": "WHATSAPP-BAILEYS"
        }
        headers = {
            "Content-Type": "application/json",
            "apikey": db.obter_configuracao('evolution_api_key', 'Senh@Segura123')
        }

        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        data = response.json()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-qrcode', methods=['POST'])
def get_qrcode():
    instancia = request.json.get('instancia', '').strip()
    if not instancia:
        return jsonify({'success': False, 'error': 'Instância não fornecida'}), 400
    try:
        evolution_url = db.obter_configuracao('evolution_api_url', 'http://evolution_api:8080')
        url = f"{evolution_url}/instance/connect/{instancia}"
        response = requests.get(url, timeout=60, headers = {"Content-Type": "application/json", "apikey": db.obter_configuracao('evolution_api_key', 'Senh@Segura123')})
        response.raise_for_status()
        data = response.json()
        return jsonify({'success': True, 'qrcode': data.get('base64')})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/templates', methods=['GET'])
def api_listar_templates():
    try:
        templates = db.obter_templates()
        templates_list = [
            {
                'id': t[0],
                'nome': t[1],
                'conteudo': t[2],
                'descricao': t[3] if t[3] else '',
                'data_criacao': t[4],
                'data_modificacao': t[5]
            }
            for t in templates
        ]
        return jsonify({'success': True, 'templates': templates_list})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/templates/<int:template_id>', methods=['GET'])
def api_obter_template(template_id):
    try:
        templates = db.obter_templates()
        template = next((t for t in templates if t[0] == template_id), None)
        
        if not template:
            return jsonify({'success': False, 'error': 'Template não encontrado'}), 404
        
        return jsonify({
            'success': True,
            'id': template[0],
            'nome': template[1],
            'conteudo': template[2],
            'descricao': template[3] if template[3] else ''
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'recarregar':
            dados = carregar_dados_automatico()
            if not dados.empty:
                flash(f'✅ Dados recarregados! {len(dados)} registro(s).', 'info')
            return redirect(url_for('index'))
        elif action == 'enviar':
            return enviar_confirmacoes_sync()
    
    data_inicio = request.args.get('data_inicio', None)
    data_fim = request.args.get('data_fim', None)
    dados = carregar_dados_automatico(data_inicio=data_inicio, data_fim=data_fim)
    
    historico_set = set()
    try:
        historico = db.obter_historico()
        if not dados.empty:
            historico_set = {(item[0], item[1]) for item in historico} 
    except Exception as e:
        print(f"⚠️ Erro histórico: {e}")
    
    return render_template('index.html', 
                         dados=dados,
                         template='',
                         historico_enviados=historico_set,
                         spreadsheet_id=db.obter_configuracao('google_spreadsheet_id', ''),
                         sheet_name=db.obter_configuracao('google_sheet_name', ''),
                         header_row=db.obter_configuracao('google_header_row', '3'),
                         data_inicio=data_inicio or '',
                         data_fim=data_fim or '')

def enviar_confirmacoes_sync():
    try:
        ids_selecionados = request.form.getlist('ids_selecionados')
        template = request.form.get('template', '').strip()
        instancia = request.form.get('instancia', '').strip()
        
        if not ids_selecionados or not template or not instancia:
            flash('Preencha todos os campos obrigatórios.', 'danger')
            return redirect(url_for('index'))
        
        db.salvar_configuracao('default_message_template', template)
        
        registros_para_enviar = []
        for idx in ids_selecionados:
            registro = {
                'ID 3ZX': request.form.get(f'id_3zx_{idx}', ''),
                'Motorista': request.form.get(f'motorista_{idx}', ''),
                'Telefone': request.form.get(f'telefone_{idx}', ''),
                'Origem': request.form.get(f'origem_{idx}', ''),
                'Destino': request.form.get(f'destino_{idx}', ''),
                'Eta Origem': request.form.get(f'eta_origem_{idx}', ''),
                'Cliente': request.form.get(f'cliente_{idx}', ''),
                'Placa': request.form.get(f'placa_{idx}', '')
            }
            registros_para_enviar.append(registro)
        
        dados_selecionados = pd.DataFrame(registros_para_enviar)
        sender = MensagemSender()
        resultados = sender.enviar_confirmacoes(dados_selecionados, template, instancia)
        
        flash(f'Processado: {len(resultados["enviados"])} enviados.', 'success')
        return redirect(url_for('index'))
        
    except Exception as e:
        flash(f'Erro ao enviar: {str(e)}', 'danger')
        return redirect(url_for('index'))

@app.route('/conectar', methods=['GET', 'POST'])
def conectar_instancia():
    try:
        instancias = fetch_instancias_evolution()
        return render_template('conectar.html', instancias=instancias)
    except Exception as e:
        flash(f'Erro instâncias: {str(e)}', 'danger')
        return redirect(url_for('index'))

@app.route('/historico')
def historico():
    historico = db.obter_historico()
    return render_template('historico.html', historico=historico)

@app.route('/templates')
def listar_templates():
    templates = db.obter_templates()
    return render_template('templates.html', templates=templates)

@app.route('/templates/novo', methods=['GET', 'POST'])
def novo_template():
    if request.method == 'POST':
        nome, conteudo = request.form.get('nome'), request.form.get('conteudo')
        if db.salvar_template(nome, conteudo, request.form.get('descricao')):
            return redirect(url_for('listar_templates'))
    return render_template('template_form.html', template=None)

@app.route('/api/enviar-lote', methods=['POST'])
def api_enviar_lote():
    global envio_em_andamento
    try:
        with envio_lock:
            if envio_em_andamento: return jsonify({'error': 'Envio em andamento'}), 409
            envio_em_andamento = True
        
        dados = request.get_json()
        template, registros, instancia = dados.get('template'), dados.get('registros'), dados.get('instancia')
        
        df = pd.DataFrame([{
            'ID 3ZX': r.get('id_3zx'), 'LT': r.get('lt'), 'Motorista': r.get('motorista'),
            'Telefone': r.get('telefone'), 'Origem': r.get('origem'), 'Destino': r.get('destino'),
            'ETA Origem': r.get('eta_origem'), 'Cliente': r.get('cliente'), 'Placa': r.get('placa')
        } for r in registros])
        
        sender = MensagemSender()
        resultados = sender.enviar_confirmacoes(df, template, instancia)
        return jsonify({'success': True, 'resumo': resultados})
    finally:
        with envio_lock: envio_em_andamento = False

@app.route('/config', methods=['GET', 'POST'])
def config():
    if not session.get('config_autenticado'):
        if request.method == 'POST' and request.form.get('action') == 'login':
            if request.form.get('senha') == db.obter_configuracao('config_senha', 'admin123'):
                session['config_autenticado'] = True
                return redirect(url_for('config'))
        return render_template('config_login.html')
    
    if request.method == 'POST':
        # Loop para salvar todas as chaves do form no banco
        for key in request.form:
            if key != 'action': db.salvar_configuracao(key, request.form.get(key))
        flash('Configurações salvas!', 'success')
        return redirect(url_for('config'))
    
    config_atual = {k: db.obter_configuracao(k, '') for k in ['google_spreadsheet_id', 'google_sheet_name', 'google_header_row', 'evolution_api_url', 'evolution_api_key']}
    return render_template('config.html', config=config_atual)

@app.route('/config/logout', methods=['GET'])
def config_logout():
    session.clear()
    flash('Desconectado com sucesso!', 'info')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)