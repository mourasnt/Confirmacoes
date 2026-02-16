import sqlite3
import hashlib
import os
from datetime import datetime

class Database:
    def __init__(self, db_path=None):
        if db_path is None:
            # Primeiro tenta usar diretório /app/data (container)
            # Se falhar, usa diretório atual
            possible_dirs = [
                '/app/data',
                os.path.join(os.getcwd(), 'data'),
                os.path.dirname(__file__),
                '/tmp'  # último recurso
            ]
            
            data_dir = None
            for dir_path in possible_dirs:
                try:
                    os.makedirs(dir_path, mode=0o777, exist_ok=True)
                    # Testa se consegue escrever
                    test_file = os.path.join(dir_path, 'test_write.tmp')
                    with open(test_file, 'w') as f:
                        f.write('test')
                    os.remove(test_file)
                    data_dir = dir_path
                    print(f"✅ Diretório de dados configurado: {data_dir}")
                    break
                except Exception as e:
                    print(f"⚠️ Tentativa falhou em {dir_path}: {e}")
                    continue
            
            if data_dir is None:
                raise Exception("Não foi possível encontrar um diretório gravável para o banco de dados")
            
            db_path = os.path.join(data_dir, 'confirmacoes.db')
            print(f"📄 Arquivo do banco: {db_path}")
        
        self.db_path = db_path
        self.init_db()
        self._verificar_e_criar_tabelas()
    
    def init_db(self):
        """Inicializa o banco de dados com as tabelas necessárias"""
        try:
            print(f"🔗 Tentando conectar ao banco: {self.db_path}")
            
            # Garantir que o diretório do banco existe
            db_dir = os.path.dirname(self.db_path)
            if not os.path.exists(db_dir):
                os.makedirs(db_dir, mode=0o777, exist_ok=True)
                print(f"📁 Diretório criado: {db_dir}")
            
            # Verificar se arquivo de banco existe, se não, criar
            if not os.path.exists(self.db_path):
                print(f"📄 Arquivo de banco não existe, criando: {self.db_path}")
                # Criar arquivo vazio
                open(self.db_path, 'a').close()
                os.chmod(self.db_path, 0o666)
                print("✅ Arquivo de banco criado!")
            
            # Conectar ao banco e criar tabelas
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            print("✅ Conexão com banco estabelecida!")
            
            # Criar tabelas se não existirem
            self._criar_tabelas(cursor)
            conn.commit()
            conn.close()
            print("✅ Tabelas verificadas/criadas!")
            
        except Exception as e:
            print(f"❌ Erro ao conectar com banco: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def _criar_tabelas(self, cursor):
        """Cria todas as tabelas necessárias"""
        # Tabela de confirmações
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS confirmacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash_confirmacao TEXT UNIQUE NOT NULL,
                id_3zx TEXT NOT NULL,
                motorista TEXT NOT NULL,
                origem TEXT NOT NULL,
                destino TEXT NOT NULL,
                eta_origem TEXT NOT NULL,
                telefone TEXT NOT NULL,
                data_envio DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela de templates
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE NOT NULL,
                conteudo TEXT NOT NULL,
                descricao TEXT,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabela de configurações
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chave TEXT UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                data_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Inserir templates padrão se não existirem
        self._inserir_templates_padrao(cursor)
    
    def _inserir_templates_padrao(self, cursor):
        """Insere templates padrão APENAS na primeira execução"""
        
        # Verifica se já foi feita a inserção inicial de templates
        cursor.execute('''
            SELECT valor FROM configuracoes WHERE chave = 'templates_padrao_inseridos'
        ''')
        resultado = cursor.fetchone()
        
        # Se já foi inserido antes, não faz nada
        if resultado and resultado[0] == 'true':
            return
        
        # Se é a primeira vez, insere os templates padrão
        templates_padrao = [
            {
                'nome': 'Básico',
                'conteudo': 'Olá {primeiro_nome}! Tudo certo para carregar a carga {lt} em {origem}?',
                'descricao': 'Template simples e informal usando primeiro nome'
            },
            {
                'nome': 'Completo',
                'conteudo': '''Olá {motorista}! 

Confirmação de agendamento:
📦 Carga: {lt}
🚚 Cliente: {cliente}
📍 Origem: {origem} 
📍 Destino: {destino}
⏰ Horário: {eta_origem}
🚛 Veículo: {placa}

Tudo certo para o carregamento?''',
                'descricao': 'Template completo com todos os detalhes'
            },
            {
                'nome': 'Profissional',
                'conteudo': '''Prezado(a) {motorista},

Solicitamos confirmação do agendamento:

ID: {id_3zx}
Carga: {lt}
Cliente: {cliente}
Origem: {origem}
Horário: {eta_origem}
Destino: {destino}
Veículo: {placa}

Por favor, confirme sua disponibilidade.

Atenciosamente.''',
                'descricao': 'Template formal e profissional'
            }
        ]
        
        for template in templates_padrao:
            try:
                cursor.execute('''
                    INSERT INTO templates (nome, conteudo, descricao)
                    VALUES (?, ?, ?)
                ''', (template['nome'], template['conteudo'], template['descricao']))
            except:
                pass  # Ignora se já existe (por nome duplicado)
        
        # Marca que os templates padrão já foram inseridos
        cursor.execute('''
            INSERT OR REPLACE INTO configuracoes (chave, valor)
            VALUES ('templates_padrao_inseridos', 'true')
        ''')
    
    def gerar_hash(self, id_3zx, motorista, origem, destino, eta_origem):
        """Gera hash único para combinação dos dados"""
        dados = f"{id_3zx}|{motorista}|{origem}|{destino}|{eta_origem}"
        return hashlib.md5(dados.encode()).hexdigest()
    
    def ja_foi_enviado(self, id_3zx, motorista, origem, destino, eta_origem):
        """Verifica se confirmação já foi enviada"""
        hash_confirmacao = self.gerar_hash(id_3zx, motorista, origem, destino, eta_origem)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT COUNT(*) FROM confirmacoes WHERE hash_confirmacao = ?",
            (hash_confirmacao,)
        )
        
        resultado = cursor.fetchone()[0] > 0
        conn.close()
        
        return resultado
    
    def registrar_envio(self, id_3zx, motorista, origem, destino, eta_origem, telefone):
        """Registra confirmação enviada no banco"""
        hash_confirmacao = self.gerar_hash(id_3zx, motorista, origem, destino, eta_origem)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO confirmacoes 
                (hash_confirmacao, id_3zx, motorista, origem, destino, eta_origem, telefone)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (hash_confirmacao, id_3zx, motorista, origem, destino, eta_origem, telefone))
            
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            # Já existe - não deveria acontecer se verificarmos antes
            return False
        finally:
            conn.close()
    
    def obter_historico(self):
        """Obtém histórico de confirmações enviadas"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id_3zx, motorista, origem, destino, eta_origem, telefone, data_envio
            FROM confirmacoes
            ORDER BY data_envio DESC
        ''')
        
        resultado = cursor.fetchall()
        conn.close()
        
        return resultado
    
    # Métodos para gerenciar templates
    def obter_templates(self):
        """Obtém todos os templates salvos"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome, conteudo, descricao, data_criacao, data_modificacao
            FROM templates
            ORDER BY nome
        ''')
        
        resultado = cursor.fetchall()
        conn.close()
        
        return resultado
    
    def obter_template(self, template_id):
        """Obtém um template específico"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome, conteudo, descricao
            FROM templates
            WHERE id = ?
        ''', (template_id,))
        
        resultado = cursor.fetchone()
        conn.close()
        
        return resultado
    
    def salvar_template(self, nome, conteudo, descricao=""):
        """Salva um novo template"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO templates (nome, conteudo, descricao)
                VALUES (?, ?, ?)
            ''', (nome, conteudo, descricao))
            
            template_id = cursor.lastrowid
            conn.commit()
            return template_id
        except sqlite3.IntegrityError:
            return None  # Nome já existe
        finally:
            conn.close()
    
    def atualizar_template(self, template_id, nome, conteudo, descricao=""):
        """Atualiza um template existente"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE templates 
                SET nome = ?, conteudo = ?, descricao = ?, data_modificacao = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (nome, conteudo, descricao, template_id))
            
            rows_affected = cursor.rowcount
            conn.commit()
            return rows_affected > 0
        except sqlite3.IntegrityError:
            return False  # Nome já existe em outro template
        finally:
            conn.close()
    
    def excluir_template(self, template_id):
        """Exclui um template"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM templates WHERE id = ?', (template_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return rows_affected > 0
    
    # Métodos para gerenciar configurações
    def salvar_configuracao(self, chave, valor):
        """Salva uma configuração"""
        print(f"🔍 DEBUG DB: Tentando salvar '{chave}' = '{valor}'")
        print(f"🔍 DEBUG DB: Caminho do banco: {self.db_path}")
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Verifica se a tabela existe
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='configuracoes'")
            tabela_existe = cursor.fetchone()
            print(f"🔍 DEBUG DB: Tabela 'configuracoes' existe: {bool(tabela_existe)}")
            
            cursor.execute('''
                INSERT OR REPLACE INTO configuracoes (chave, valor, data_modificacao)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ''', (chave, valor))
            
            rows_affected = cursor.rowcount
            print(f"🔍 DEBUG DB: Linhas afetadas: {rows_affected}")
            
            conn.commit()
            
            # Verifica se realmente salvou
            cursor.execute('SELECT valor FROM configuracoes WHERE chave = ?', (chave,))
            verificacao = cursor.fetchone()
            print(f"🔍 DEBUG DB: Verificação pós-save: {verificacao}")
            
            conn.close()
            print(f"🔍 DEBUG DB: Configuração '{chave}' salva com sucesso!")
            
        except Exception as e:
            print(f"🔍 DEBUG DB: ERRO ao salvar configuração: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def obter_configuracao(self, chave, padrao=None):
        """Obtém uma configuração"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT valor FROM configuracoes WHERE chave = ?', (chave,))
        resultado = cursor.fetchone()
        conn.close()
        
        return resultado[0] if resultado else padrao
    
    def obter_todas_configuracoes(self):
        """Obtém todas as configurações"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT chave, valor FROM configuracoes')
        resultado = dict(cursor.fetchall())
        conn.close()
        
        return resultado
    
    def _verificar_e_criar_tabelas(self):
        """Método mantido para compatibilidade - lógica movida para init_db"""
        pass  # Toda lógica foi movida para init_db() e _criar_tabelas()