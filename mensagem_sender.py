import random
import requests
import json
import time
import os
from dotenv import load_dotenv
from database import Database

# Carrega variáveis de ambiente
load_dotenv()

class MensagemSender:
    def __init__(self):
        self.db = Database()
        # Busca configurações do banco de dados
        self.api_url = self.db.obter_configuracao('evolution_api_url')
        self.api_key = self.db.obter_configuracao('evolution_api_key')
    
    def limpar_telefone(self, telefone):
        """Remove todos os caracteres não numéricos do telefone"""
        if not telefone:
            return ''
        
        # Remove todos os caracteres que não são dígitos
        import re
        telefone_limpo = re.sub(r'\D', '', str(telefone))
        
        # Adiciona código do país se não tiver
        if telefone_limpo and len(telefone_limpo) >= 10:
            # Se tem 11 dígitos (celular) ou 10 dígitos (fixo), adiciona 55
            if len(telefone_limpo) in [10, 11]:
                telefone_limpo = '55' + telefone_limpo
            # Se já tem 13 dígitos (55 + 11), mantém como está
            elif len(telefone_limpo) == 13:
                pass
            # Se tem 12 dígitos (55 + 10), mantém como está  
            elif len(telefone_limpo) == 12:
                pass
        
        return telefone_limpo
    
    def processar_template(self, template, dados):
        """Substitui variáveis no template com dados do registro"""
        try:
            # Processa nome do motorista
            nome_completo = dados.get('Motorista', '')
            nome_formatado = nome_completo.title() if nome_completo else ''
            primeiro_nome = nome_formatado.split()[0] if nome_formatado else ''
            
            # Dicionário de mapeamento para substituição
            variaveis = {
                'motorista': nome_formatado,
                'primeiro_nome': primeiro_nome,
                'lt': dados.get('LT', ''),
                'origem': dados.get('Origem', ''),
                'destino': dados.get('Destino', ''),
                'eta_origem': dados.get('ETA Origem', ''),
                'cliente': dados.get('Cliente', ''),
                'placa': dados.get('Placa', ''),
                'placa2': dados.get('Placa 2', ''),  # Note o espaço na coluna real
                'id_3zx': dados.get('ID 3ZX', ''),
                'telefone': dados.get('Telefone', ''),
                'data': dados.get('Data', ''),
                'n_carga': dados.get('N° Carga', ''),
                'operacao': dados.get('Operação', '')
            }
            
            # Substitui as variáveis no template
            mensagem = template.format(**variaveis)
            return mensagem
            
        except KeyError as e:
            print(f"Erro: Variável {e} não encontrada no template")
            return None
        except Exception as e:
            print(f"Erro ao processar template: {e}")
            return None
    
    def envia_mensagem(self, telefone, mensagem, instancia):
        """Envia mensagem via Evolution API"""
        # Monta a URL completa do endpoint
        url_endpoint = f"{self.api_url}/message/sendText/{instancia}"
        
        # Monta o payload
        payload = {
            "number": telefone,  # Agora usa o telefone limpo passado como parâmetro
            "options": {
                "delay": 1200,
                "presence": "composing"
            },
            "text": mensagem
        }
        
        # Headers com autenticação
        headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }
        
        print(f"\n{'='*80}")
        print(f"📤 ENVIANDO MENSAGEM")
        print(f"{'='*80}")
        print(f"📞 Telefone: {telefone}")
        print(f"📡 URL: {url_endpoint}")
        print(f"🔑 API Key: {self.api_key[:10]}...{self.api_key[-5:]}")
        print(f"\n📦 PAYLOAD:")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        print(f"{'='*80}\n")
        
        try:
            print("⏳ Aguardando resposta da Evolution API (timeout: 120s)...")
            response = requests.post(url_endpoint, headers=headers, data=json.dumps(payload), timeout=120)
            
            print(f"\n{'='*80}")
            print(f"📥 RESPOSTA DA API")
            print(f"{'='*80}")
            print(f" Status Code: {response.status_code}")
            print(f" Response Headers: {dict(response.headers)}")
            print(f"\n Response Body:")
            try:
                # Tenta formatar como JSON
                response_json = response.json()
                print(json.dumps(response_json, indent=2, ensure_ascii=False))
            except:
                # Se não for JSON, mostra texto puro
                print(response.text)
            print(f"{'='*80}\n")
            
            response.raise_for_status()
            
            print("✅ Mensagem enviada com sucesso!")
            return True
            
        except requests.exceptions.HTTPError as errh:
            print(f"\n{'='*80}")
            print(f"❌ ERRO HTTP")
            print(f"{'='*80}")
            print(f" Status Code: {errh.response.status_code}")
            print(f" Response Body: {errh.response.text}")
            print(f"{'='*80}\n")
            return False
        except requests.exceptions.ConnectionError as errc:
            print(f"\n{'='*80}")
            print(f"❌ ERRO DE CONEXÃO")
            print(f"{'='*80}")
            print(f"🌐 URL tentada: {self.api_url}")
            print(f"📄 Detalhes: {errc}")
            print(f"{'='*80}\n")
            return False
        except requests.exceptions.Timeout as errt:
            print(f"\n{'='*80}")
            print(f"❌ ERRO DE TIMEOUT")
            print(f"{'='*80}")
            print(f"📄 Detalhes: {errt}")
            print(f"{'='*80}\n")
            return False
        except requests.exceptions.RequestException as err:
            print(f"\n{'='*80}")
            print(f"❌ ERRO NA REQUISIÇÃO")
            print(f"{'='*80}")
            print(f"📄 Detalhes: {err}")
            print(f"{'='*80}\n")
            return False
    
    def enviar_confirmacoes(self, registros_selecionados, template, instancia):
        """Envia confirmações para registros selecionados - PROCESSA TUDO EM LOTE"""
        print(f"\n{'='*80}")
        print(f"INICIANDO ENVIO EM LOTE")
        print(f"{'='*80}")
        print(f"📊 Total de registros: {len(registros_selecionados)}")
        print(f"Template: {template}")
        print(f"Instância Evolution: {instancia}")
        print(f"{'='*80}\n")
        
        resultados = {
            'enviados': [],
            'pulados': [],
            'erros': []
        }
        
        # PROCESSA TODOS OS REGISTROS NO BACKEND
        for idx, (_, registro) in enumerate(registros_selecionados.iterrows()):
            numero_atual = idx + 1
            print(f"\n{'─'*80}")
            print(f" PROCESSANDO {numero_atual}/{len(registros_selecionados)}")
            print(f"{'─'*80}")
            
            id_3zx = registro.get('ID 3ZX', '')
            motorista = registro.get('Motorista', '')
            origem = registro.get('Origem', '')
            destino = registro.get('Destino', '')
            eta_origem = registro.get('ETA Origem', '')
            telefone_original = registro.get('Telefone', '')
            
            print(f"🆔 ID: {id_3zx}")
            print(f" Motorista: {motorista}")
            print(f" Telefone original: {telefone_original}")
            
            # Limpa e valida telefone
            telefone = self.limpar_telefone(telefone_original)
            print(f" Telefone limpo: {telefone}")
            
            # Verifica se já foi enviado
            if self.db.ja_foi_enviado(id_3zx, motorista, origem, destino, eta_origem):
                print(f"⏭️  JÁ ENVIADO - ENVIANDO NOVAMENTE")
                resultados['pulados'].append({
                    'id_3zx': id_3zx,
                    'motorista': motorista,
                    'telefone': telefone_original,
                    'motivo': 'Já enviado anteriormente'
                })
            
            # Processa template
            mensagem = self.processar_template(template, registro)
            if mensagem is None:
                print(f"❌ ERRO NO TEMPLATE")
                resultados['erros'].append({
                    'id_3zx': id_3zx,
                    'motorista': motorista,
                    'telefone': telefone_original,
                    'motivo': 'Erro no template'
                })
                continue
            
            print(f" Mensagem: {mensagem[:50]}...")
            
            # Valida telefone limpo
            if not telefone or len(telefone) < 10:
                print(f"❌ TELEFONE INVÁLIDO")
                resultados['erros'].append({
                    'id_3zx': id_3zx,
                    'motorista': motorista,
                    'telefone': telefone_original,
                    'motivo': f'Telefone inválido: {telefone_original}'
                })
                continue
            
            # Envia mensagem - AGUARDA RESPOSTA COMPLETA
            print(f"📤 Enviando para {telefone}...")
            print(f"⏳ AGUARDANDO RESPOSTA COMPLETA DA API...")
            
            envio_sucesso = self.envia_mensagem(telefone, mensagem, instancia)
            
            print(f"\n🔍 RESULTADO: {'✅ SUCESSO' if envio_sucesso else '❌ FALHA'}\n")
            
            if envio_sucesso:
                # Registra no banco
                if self.db.registrar_envio(id_3zx, motorista, origem, destino, eta_origem, telefone):
                    resultados['enviados'].append({
                        'id_3zx': "", #Não registrar no banco, permitindo envios múltiplos
                        'motorista': motorista,
                        'telefone': telefone
                    })
                    print(f"✅ SUCESSO - Enviado e registrado")
                else:
                    print(f"⚠️  ATENÇÃO - Enviado mas erro ao registrar no banco")
                    resultados['enviados'].append({
                        'id_3zx': id_3zx,
                        'motorista': motorista,
                        'telefone': telefone
                    })
            else:
                print(f"❌ FALHA NO ENVIO")
                resultados['erros'].append({
                    'id_3zx': id_3zx,
                    'motorista': motorista,
                    'telefone': telefone_original,
                    'motivo': 'Erro no envio da mensagem'
                })
            
            # Delay entre envios - AGUARDA 3 SEGUNDOS ANTES DO PRÓXIMO
            if numero_atual < len(registros_selecionados):
                print(f"\n⏳ Aguardando até 12 segundos antes do próximo envio...\n")
                time.sleep(random.uniform(5, 12))
        
        # RESUMO FINAL
        print(f"\n{'='*80}")
        print(f"📊 RESUMO DO LOTE")
        print(f"{'='*80}")
        print(f"✅ Enviados: {len(resultados['enviados'])}")
        print(f"⏭️ Enviado novamente: {len(resultados['pulados'])}")
        print(f"❌ Erros: {len(resultados['erros'])}")
        print(f"{'='*80}\n")
        
        return resultados