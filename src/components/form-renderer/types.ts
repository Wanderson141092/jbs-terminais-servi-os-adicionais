export interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  estilo?: string;
}

export interface PerguntaComCondicao {
  id: string;
  tipo: string;
  rotulo: string;
  placeholder: string | null;
  opcoes: unknown;
  config: unknown;
  descricao: string | null;
  obrigatorio: boolean;
  ordem: number;
  largura?: number;
  condicao: {
    pergunta_pai_id: string;
    valor_gatilho: string;
    operador: string;
  } | null;
}

export interface FormRendererProps {
  formularioId: string;
  onSuccess?: () => void;
}
