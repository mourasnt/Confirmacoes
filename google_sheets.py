import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from typing import List, Dict, Optional
import os
import httplib2
from google_auth_httplib2 import AuthorizedHttp
import re


class GoogleSheetsReader:
    """
    Leitura rápida e otimizada da Google Sheets API.
    """
    
    def __init__(self, spreadsheet_id: str, credentials_file: str = "credentials.json"):
        self.spreadsheet_id = spreadsheet_id
        self.credentials_file = credentials_file
        self.scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
        self.service = self._authenticate()

    def _limpar_string(self, texto):
        """Remove caracteres de controle inválidos de strings."""
        if not isinstance(texto, str):
            return texto
        # Remove caracteres de controle exceto tabs e newlines comuns
        return re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', texto)
    
    def _authenticate(self):
        """Autentica com Google Sheets API usando Service Account."""
        if not os.path.exists(self.credentials_file):
            raise FileNotFoundError(f"Arquivo de credenciais '{self.credentials_file}' não encontrado.")
        
        # 1) Credenciais
        creds = service_account.Credentials.from_service_account_file(
            self.credentials_file,
            scopes=self.scopes
        )

        # 2) Http com timeout configurável
        http = httplib2.Http(timeout=300)

        # 3) AuthorizedHttp — AGORA FUNCIONA!
        authed_http = AuthorizedHttp(creds, http=http)

        # 4) Build usando http autorizado com timeout
        return build(
            "sheets",
            "v4",
            http=authed_http,
            cache_discovery=False
        )
    
    # ----------------------------------------------------------------------
    # 📌 OBTÉM LISTA DE ABAS
    # ----------------------------------------------------------------------
    def obter_abas(self) -> List[Dict]:
        try:
            metadata = self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
            sheets = metadata.get("sheets", [])
            return [
                {
                    "id": s["properties"]["sheetId"],
                    "nome": s["properties"]["title"],
                    "index": s["properties"]["index"],
                }
                for s in sheets
            ]
        except Exception as e:
            print(f"❌ Erro ao obter abas: {e}")
            return []

    # ----------------------------------------------------------------------
    # 🚀 LEITURA TURBO — MUITO MAIS RÁPIDA
    # ----------------------------------------------------------------------
    def ler_planilha(
        self,
        aba_nome: str,
        col_range: str = "A:T",
        linha_cabecalho: int = 1,
        linha_inicio_dados: Optional[int] = None
    ) -> pd.DataFrame:

        try:
            print(f"\n🔍 [ler_planilha] Aba: {aba_nome}, Range: {col_range}")
            
            # 1) Metadados
            print("📥 Buscando metadados da planilha...")
            metadata = self.service.spreadsheets().get(
                spreadsheetId=self.spreadsheet_id
            ).execute()

            sheet_info = next(
                s for s in metadata["sheets"] if s["properties"]["title"] == aba_nome
            )

            total_rows = sheet_info["properties"]["gridProperties"]["rowCount"]
            print(f"📊 Total de linhas na planilha: {total_rows}")

            # 2) Range real início → se linha_inicio_dados existir, usamos ele
            start_row = linha_inicio_dados if linha_inicio_dados else linha_cabecalho
            
            start_col, end_col = col_range.split(":")
            range_real = f"{aba_nome}!{start_col}{start_row}:{end_col}{total_rows}"
            print(f"📍 Range real: {range_real}")

            # 3) Leitura turbo
            print("📥 Executando batchGet...")
            result = self.service.spreadsheets().values().batchGet(
                spreadsheetId=self.spreadsheet_id,
                ranges=[range_real]
            ).execute()

            values = result["valueRanges"][0].get("values", [])
            print(f"✅ Recebeu {len(values)} linhas do Google Sheets")
            
            if not values:
                print("⚠️ Nenhum dado retornado")
                return pd.DataFrame()
            
            # Limpa caracteres de controle de todas as células
            print("🧹 Limpando caracteres de controle...")
            values = [[self._limpar_string(cell) for cell in row] for row in values]
            print("✅ Limpeza concluída")

            # 4) Cabeçalhos (sempre da linha_cabecalho REAL)
            header_range = f"{aba_nome}!{start_col}{linha_cabecalho}:{end_col}{linha_cabecalho}"

            header_result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=header_range
            ).execute()

            headers = header_result.get("values", [[]])[0]

            # Dados = valores já retornados, começando no linha_inicio_dados
            data = values

            # 5) Normaliza
            max_cols = len(headers)
            data = [row + [""] * (max_cols - len(row)) for row in data]

            print(f"📊 Criando DataFrame com {len(data)} linhas e {len(headers)} colunas...")
            df = pd.DataFrame(data, columns=headers)
            print("🧹 Removendo linhas vazias...")
            df = df.dropna(how="all")
            print(f"✅ DataFrame final: {len(df)} linhas")

            return df

        except Exception as e:
            import traceback
            print(f"\n{'='*80}")
            print(f"❌ ERRO EM ler_planilha()")
            print(f"{'='*80}")
            print(f"Tipo: {type(e).__name__}")
            print(f"Mensagem: {e}")
            print(f"\nTraceback completo:")
            print(traceback.format_exc())
            print(f"{'='*80}\n")
            return pd.DataFrame()


    # ----------------------------------------------------------------------
    # 🔎 FILTRA PRÉ-AGENDADOS
    # ----------------------------------------------------------------------
    def filtrar_pre_agendados(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        
        for col in ["Status", "status", "STATUS"]:
            if col in df.columns:
                return df[df[col].str.lower().str.contains("pré agendado", na=False)]

        print("⚠️ Coluna de status não encontrada.")
        return df

    # ----------------------------------------------------------------------
    # 🎯 OBTÉM DADOS PRONTOS PARA CONFIRMAÇÃO
    # ----------------------------------------------------------------------
    def obter_dados_confirmacao(
        self,
        aba_nome: str,
        linha_cabecalho: int = 1,
        linha_inicio_dados: Optional[int] = None,   # <-- adicionamos aqui
        mapeamento_colunas: Optional[Dict[str, str]] = None,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None
    ) -> pd.DataFrame:

        # Passa tudo para o método de leitura turbo
        df = self.ler_planilha(
            aba_nome=aba_nome,
            linha_cabecalho=linha_cabecalho,
            linha_inicio_dados=linha_inicio_dados      # <-- passamos aqui também
        )

        if df.empty:
            return df

        # Mapeia nomes das colunas
        if mapeamento_colunas:
            for novo, antigo in mapeamento_colunas.items():
                if antigo in df.columns:
                    df.rename(columns={antigo: novo}, inplace=True)

        # Filtra pré-agendados
        df = self.filtrar_pre_agendados(df)

        # Campos obrigatórios
        obrigatorias = ["ID 3ZX", "Motorista", "Origem", "Telefone"]
        for campo in obrigatorias:
            if campo in df.columns:
                df = df[df[campo].notna() & (df[campo] != "")]

        # Filtro por datas
        if "ETA Origem" in df.columns:
            print(f"🔍 Filtro de data recebido - Início: '{data_inicio}' | Fim: '{data_fim}'")
            
            df["ETA_datetime"] = pd.to_datetime(
                df["ETA Origem"], 
                format="%d/%m/%Y %H:%M",
                errors="coerce"
            )

            if data_inicio:
                try:
                    data_inicio_parsed = pd.to_datetime(data_inicio, format="%d/%m/%Y %H:%M")
                    print(f"✅ Data início parseada: {data_inicio_parsed}")
                    df = df[df["ETA_datetime"] >= data_inicio_parsed]
                except Exception as e:
                    print(f"❌ Erro ao parsear data_inicio '{data_inicio}': {e}")

            if data_fim:
                try:
                    data_fim_parsed = pd.to_datetime(data_fim, format="%d/%m/%Y %H:%M")
                    print(f"✅ Data fim parseada: {data_fim_parsed}")
                    df = df[df["ETA_datetime"] <= data_fim_parsed]
                except Exception as e:
                    print(f"❌ Erro ao parsear data_fim '{data_fim}': {e}")

            print(f"📊 Registros após filtro de data: {len(df)}")
            df = df.sort_values("ETA_datetime").drop(columns=["ETA_datetime"], errors="ignore")

        return df