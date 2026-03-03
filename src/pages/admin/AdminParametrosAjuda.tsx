// ============= Full file contents =============

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Globe, Eye, List, Settings, GitBranch, Ban, Clock, Bell, FileText, Link2, Shield, HelpCircle, Timer, BarChart3, Upload, Download, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CampoDoc {
  nome: string;
  descricao: string;
  obrigatorio?: boolean;
}

interface AcaoDoc {
  nome: string;
  descricao: string;
  icone?: string;
}

interface SecaoDoc {
  titulo: string;
  descricao: string;
  campos?: CampoDoc[];
  acoes?: AcaoDoc[];
  subsecoes?: { titulo: string; descricao: string; campos?: CampoDoc[]; acoes?: AcaoDoc[] }[];
}

interface AbaDoc {
  id: string;
  titulo: string;
  icone: React.ReactNode;
  descricao: string;
  secoes: SecaoDoc[];
}

const DOCUMENTACAO: AbaDoc[] = [
  {
    id: "pagina-externa",
    titulo: "Pág. Externa",
    icone: <Globe className="h-5 w-5" />,
    descricao: "Configurações da página pública (visível para clientes externos). Controla quais botões e funcionalidades estão disponíveis na página inicial do sistema.",
    secoes: [
      {
        titulo: "Botões Externos",
        descricao: "Gerencia os botões de ação exibidos na página externa. Cada botão pode abrir um formulário interno, um link externo ou um iframe embutido.",
        campos: [
          { nome: "Título", descricao: "Nome exibido no botão para o cliente.", obrigatorio: true },
          { nome: "Descrição", descricao: "Texto de apoio exibido abaixo do título do botão." },
          { nome: "Ícone", descricao: "Ícone visual do botão. Inclui opções temáticas portuárias como Navio, Contêiner, Armazém, STS/Guindaste, Pilha de Contêineres, etc." },
          { nome: "Tipo", descricao: "Define o comportamento: 'iframe' (abre conteúdo embutido), 'link' (redireciona para URL externa) ou 'formulario' (abre formulário interno do sistema)." },
          { nome: "URL", descricao: "Endereço web de destino (usado quando o tipo é 'iframe' ou 'link')." },
          { nome: "Formulário", descricao: "Seleciona qual formulário interno será aberto (usado quando o tipo é 'formulario')." },
          { nome: "Abrir em Nova Aba", descricao: "Se ativado, o link será aberto em uma nova aba do navegador." },
          { nome: "Ativo", descricao: "Controla se o botão é visível na página externa." },
          { nome: "Ordem", descricao: "Define a posição do botão na lista (menor número = aparece primeiro)." },
        ],
        acoes: [
          { nome: "Adicionar Botão", descricao: "Cria um novo botão na página externa." },
          { nome: "Editar", descricao: "Altera as configurações de um botão existente." },
          { nome: "Excluir", descricao: "Remove permanentemente o botão da página externa." },
          { nome: "Ativar/Desativar", descricao: "Alterna a visibilidade do botão sem excluí-lo." },
        ],
      },
      {
        titulo: "Configurações da Página",
        descricao: "Controles gerais da página externa, como título, textos e visibilidade de seções.",
        campos: [
          { nome: "Título da Página", descricao: "Título principal exibido no cabeçalho da página externa." },
          { nome: "Subtítulo", descricao: "Texto complementar exibido abaixo do título." },
          { nome: "Mostrar Portal do Cliente", descricao: "Controla se o botão de consulta (Portal do Cliente) é exibido na página externa." },
        ],
      },
    ],
  },
  {
    id: "pagina-interna",
    titulo: "Pág. Interna",
    icone: <Eye className="h-5 w-5" />,
    descricao: "Configurações da página interna (visível apenas para usuários autenticados). Controla regras de roteamento, visualização de anexos e ativações de funcionalidades.",
    secoes: [
      {
        titulo: "Visualização de Anexos",
        descricao: "A configuração de anexos embutidos ou botão visualizar é definida por serviço. Acesse o menu 'Serviços' para configurar individualmente.",
      },
      {
        titulo: "Regras de Roteamento",
        descricao: "Define quais setores devem ser notificados para atuar em processos com base em critérios específicos (campo + valor).",
        campos: [
          { nome: "Serviço", descricao: "Serviço ao qual a regra de roteamento se aplica.", obrigatorio: true },
          { nome: "Campo Critério", descricao: "Campo do mapeamento de campos utilizado como base para o roteamento.", obrigatorio: true },
          { nome: "Valor do Critério", descricao: "Valor específico que ativa o roteamento. Deixe vazio para aplicar a qualquer valor." },
          { nome: "Setores", descricao: "Lista de setores que serão notificados quando o critério for atendido.", obrigatorio: true },
        ],
        acoes: [
          { nome: "Adicionar Regra", descricao: "Cria nova regra de roteamento." },
          { nome: "Editar", descricao: "Modifica uma regra existente." },
          { nome: "Excluir", descricao: "Remove permanentemente a regra." },
        ],
      },
      {
        titulo: "Ativação de Funcionalidades (Toggle)",
        descricao: "Configura quais combinações de Serviço + Status + Pendências habilitam funcionalidades especiais como Deferimento e Lacre Armador.",
        subsecoes: [
          {
            titulo: "Deferimento",
            descricao: "Define em quais status e pendências o módulo de Deferimento é habilitado para cada serviço.",
            campos: [
              { nome: "Status de Ativação", descricao: "Status do processo que habilita o Deferimento." },
              { nome: "Pendências de Ativação", descricao: "Pendências selecionadas que habilitam o Deferimento." },
            ],
          },
          {
            titulo: "Lacre Armador",
            descricao: "Define em quais status e pendências o módulo de Lacre Armador é habilitado para cada serviço.",
            campos: [
              { nome: "Status de Ativação", descricao: "Status do processo que habilita o Lacre Armador." },
              { nome: "Pendências de Ativação", descricao: "Pendências selecionadas que habilitam o Lacre Armador." },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "campos-respostas",
    titulo: "Campos",
    icone: <List className="h-5 w-5" />,
    descricao: "Gerencia os valores predefinidos dos campos de resposta utilizados em todo o sistema. Organizado por grupos.",
    secoes: [
      {
        titulo: "Grupos de Parâmetros",
        descricao: "Cada grupo define as opções disponíveis em um tipo de campo específico.",
        subsecoes: [
          {
            titulo: "Tipo Carga",
            descricao: "Opções de tipo de carga disponíveis nos formulários (ex: Carga Geral, Granel, Contêiner).",
            campos: [
              { nome: "Valor", descricao: "Nome da opção exibida no formulário.", obrigatorio: true },
              { nome: "Sigla", descricao: "Abreviação ou código interno (opcional)." },
              { nome: "Serviços", descricao: "Restringe a opção a serviços específicos. Vazio = disponível para todos." },
              { nome: "Ordem", descricao: "Posição na lista de opções." },
            ],
          },
          {
            titulo: "Categoria",
            descricao: "Opções de categoria para classificação dos processos.",
          },
          {
            titulo: "Status de Processo",
            descricao: "Define os status possíveis que um processo pode assumir ao longo do ciclo. Cada status possui uma sigla usada internamente e um rótulo amigável.",
            campos: [
              { nome: "Valor", descricao: "Rótulo do status exibido na interface.", obrigatorio: true },
              { nome: "Sigla", descricao: "Código interno usado nas regras e no banco de dados.", obrigatorio: true },
              { nome: "Tipo Resultado", descricao: "Classificação visual: conforme (verde), nao_conforme (vermelho), pendencia (âmbar), neutro (azul)." },
            ],
          },
          {
            titulo: "Status de Deferimento",
            descricao: "Opções de status específicas para o módulo de Deferimento.",
          },
          {
            titulo: "Pendências",
            descricao: "Lista de pendências que podem ser associadas a processos.",
          },
        ],
      },
    ],
  },
  {
    id: "campos-fixos",
    titulo: "Campos Fixos",
    icone: <Settings className="h-5 w-5" />,
    descricao: "Configura a visibilidade e obrigatoriedade dos campos fixos do processo (campos nativos da tabela de solicitações) na tela de análise e na consulta externa.",
    secoes: [
      {
        titulo: "Configuração dos Campos",
        descricao: "Cada campo fixo pode ser configurado individualmente por serviço.",
        campos: [
          { nome: "Campo", descricao: "Nome do campo nativo do sistema (ex: numero_conteiner, tipo_carga, lpco)." },
          { nome: "Rótulo", descricao: "Nome amigável exibido na interface." },
          { nome: "Visível na Análise", descricao: "Se ativado, o campo aparece na tela de análise interna." },
          { nome: "Obrigatório na Análise", descricao: "Se ativado, o campo deve ser preenchido antes de salvar a análise." },
          { nome: "Visível Externamente", descricao: "Se ativado, o campo é exibido na consulta pública do cliente." },
          { nome: "Serviços", descricao: "Restringe o campo a serviços específicos. Vazio = disponível para todos." },
          { nome: "Ordem", descricao: "Posição do campo na tela de análise." },
        ],
      },
    ],
  },
  {
    id: "consulta-etapas",
    titulo: "Consulta",
    icone: <GitBranch className="h-5 w-5" />,
    descricao: "Configura as etapas exibidas na timeline de consulta pública e no checklist interno. Define quais status ativam cada etapa e como são exibidas.",
    secoes: [
      {
        titulo: "Etapas da Timeline / Checklist",
        descricao: "Cada etapa representa um ponto de progresso no ciclo do processo.",
        campos: [
          { nome: "Título", descricao: "Nome da etapa exibido na timeline ou checklist.", obrigatorio: true },
          { nome: "Chave", descricao: "Identificador único interno da etapa.", obrigatorio: true },
          { nome: "Descrição", descricao: "Texto explicativo exibido ao expandir a etapa." },
          { nome: "Tipo", descricao: "Define se a etapa é do tipo 'timeline' (consulta pública) ou 'checklist' (análise interna)." },
          { nome: "Grupo", descricao: "Agrupamento lógico da etapa (ex: geral, vistoria)." },
          { nome: "Status Gatilho", descricao: "Lista de status que, quando atingidos, ativam esta etapa." },
          { nome: "Etapa Equivalente", descricao: "Vincula a uma etapa correspondente no outro tipo (timeline ↔ checklist)." },
          { nome: "Serviços", descricao: "Restringe a etapa a serviços específicos." },
          { nome: "Ordem", descricao: "Posição da etapa na sequência." },
        ],
      },
    ],
  },
  {
    id: "cancelamento-recusa",
    titulo: "Cancel./Recusa",
    icone: <Ban className="h-5 w-5" />,
    descricao: "Configura em quais status os botões de cancelamento e recusa são habilitados, por serviço.",
    secoes: [
      {
        titulo: "Regras de Cancelamento",
        descricao: "Define os status nos quais o cliente externo pode solicitar o cancelamento do processo.",
        campos: [
          { nome: "Serviços", descricao: "Serviços onde a regra se aplica." },
          { nome: "Status Habilitados", descricao: "Status nos quais o botão de cancelamento fica disponível." },
        ],
      },
      {
        titulo: "Regras de Recusa",
        descricao: "Define os status nos quais um usuário interno pode recusar o processo.",
        campos: [
          { nome: "Serviços", descricao: "Serviços onde a regra se aplica." },
          { nome: "Status Habilitados", descricao: "Status nos quais o botão de recusa fica disponível para o usuário interno." },
        ],
      },
    ],
  },
  {
    id: "regras",
    titulo: "Regras",
    icone: <Clock className="h-5 w-5" />,
    descricao: "Define regras operacionais por serviço: hora de corte para recebimento, limites de quantidade e dias de operação. Cada serviço pode ter apenas uma regra.",
    secoes: [
      {
        titulo: "Regras por Serviço",
        descricao: "Cada regra define as restrições operacionais de um serviço específico.",
        campos: [
          { nome: "Serviço", descricao: "Serviço ao qual a regra se aplica. Cada serviço pode ter apenas uma regra.", obrigatorio: true },
          { nome: "Hora de Corte", descricao: "Horário limite para recebimento de solicitações no dia. Após esse horário, aplica-se o comportamento configurado (recusar ou agendar).", obrigatorio: true },
          { nome: "Dias de Operação", descricao: "Dias da semana em que o serviço opera. Solicitações fora desses dias seguem a regra de corte." },
          { nome: "Tipo de Limite", descricao: "Define como o limite de quantidade funciona: 'Sem limite' (ilimitado), 'Limite fixo por dia' (mesmo valor todos os dias) ou 'Limite por dia da semana' (valor individual por dia)." },
          { nome: "Limite por dia", descricao: "Quantidade máxima de solicitações permitidas por dia (quando tipo de limite é fixo)." },
          { nome: "Limites por dia da semana", descricao: "Quantidade individual para cada dia (Seg, Ter, Qua, Qui, Sex, Sáb)." },
          { nome: "Aplica dia anterior", descricao: "Quando este campo estiver ativado, a regra de corte considera o horário do pedido E a data informada nos campos data_posicionamento ou data_agendamento. O corte aplica-se apenas se o horário ≥ corte E a data informada for D+1 ou anterior. Quando desativado, o corte aplica-se apenas pelo horário." },
        ],
        acoes: [
          { nome: "Adicionar Regra", descricao: "Cria nova regra para um serviço." },
          { nome: "Editar (✏️)", descricao: "Modifica os parâmetros da regra." },
          { nome: "Excluir (🗑️)", descricao: "Remove permanentemente a regra." },
        ],
      },
      {
        titulo: "Comportamento após o Corte (⏱️)",
        descricao: "Configuração acessível pelo botão ⏱️ (laranja) nas ações de cada regra. Define o que acontece quando uma solicitação é enviada após o horário de corte. As opções são mutuamente exclusivas.",
        campos: [
          { nome: "Recusar automaticamente", descricao: "Quando ativado, solicitações enviadas após o horário de corte são automaticamente recusadas. Exibe a mensagem 'Solicitação enviada após o prazo de recebimento'. Reativação somente por usuário interno com justificativa." },
          { nome: "Agendar para próximo dia ativo", descricao: "Quando ativado, solicitações após o corte são automaticamente agendadas para o próximo dia marcado como ativo na regra." },
        ],
      },
    ],
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    icone: <Bell className="h-5 w-5" />,
    descricao: "Configura regras de notificação automática: quais mudanças de status disparam notificações, para quais setores e por quais canais.",
    secoes: [
      {
        titulo: "Regras de Notificação",
        descricao: "Cada regra define um gatilho de notificação baseado na mudança de status de um processo.",
        campos: [
          { nome: "Serviço", descricao: "Serviço ao qual a regra se aplica.", obrigatorio: true },
          { nome: "Status Gatilho", descricao: "Status que, quando atingido, dispara a notificação.", obrigatorio: true },
          { nome: "Setores Destino", descricao: "Setores que receberão a notificação. Se vazio, todos os setores são notificados." },
          { nome: "Tipos de Notificação", descricao: "Canais de envio: Push (nativa do navegador), Toast (pop-up na tela) ou E-mail.", obrigatorio: true },
          { nome: "Ativo", descricao: "Controla se a regra está ativa sem excluí-la." },
        ],
        acoes: [
          { nome: "Adicionar Regra", descricao: "Cria nova regra de notificação." },
          { nome: "Editar", descricao: "Modifica uma regra existente." },
          { nome: "Excluir", descricao: "Remove permanentemente a regra." },
          { nome: "Ativar/Desativar", descricao: "Alterna o estado da regra." },
        ],
      },
    ],
  },
  {
    id: "protocolo",
    titulo: "Protocolo",
    icone: <FileText className="h-5 w-5" />,
    descricao: "Configura o formato dos protocolos gerados automaticamente para cada nova solicitação.",
    secoes: [
      {
        titulo: "Configuração de Protocolo",
        descricao: "O protocolo é gerado automaticamente no formato: [PREFIXO][CÓDIGO_SERVIÇO][NÚMERO_SEQUENCIAL].",
        campos: [
          { nome: "Prefixo do Protocolo", descricao: "Texto inicial do protocolo (ex: JBS). Máximo de 5 caracteres. Aparece antes do código do serviço.", obrigatorio: true },
          { nome: "Último Número Gerado", descricao: "Número sequencial atual do contador. Campo apenas informativo, não editável." },
        ],
      },
    ],
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    icone: <BarChart3 className="h-5 w-5" />,
    descricao: "Página de gerenciamento de modelos de relatório. Acessível por todos os perfis de usuário através do menu 'Relatórios' no dashboard. Administradores podem importar novos modelos; todos os usuários podem visualizar e baixar.",
    secoes: [
      {
        titulo: "Modelos de Relatório",
        descricao: "Lista todos os modelos de relatório disponíveis para download. Acessível em: Dashboard > Relatórios > Modelos de Relatório.",
        campos: [
          { nome: "Arquivo", descricao: "Arquivo do modelo a ser importado (Excel, PDF, Word). Tamanho máximo: 20MB.", obrigatorio: true },
          { nome: "Nome do Modelo", descricao: "Nome identificador do modelo exibido na lista para todos os usuários.", obrigatorio: true },
          { nome: "Descrição", descricao: "Texto explicativo sobre o conteúdo e uso do modelo." },
        ],
        acoes: [
          { nome: "Adicionar Modelo (Importar)", descricao: "Faz o upload de um novo arquivo de modelo para o sistema." },
          { nome: "Baixar", descricao: "Faz o download do arquivo de modelo original." },
          { nome: "Excluir", descricao: "Remove permanentemente o modelo do sistema." },
          { nome: "Ativar/Desativar", descricao: "Alterna a visibilidade do modelo para os usuários." },
        ],
      },
    ],
  },
  {
    id: "formularios",
    titulo: "Formulários",
    icone: <FileText className="h-5 w-5" />,
    descricao: "Central de criação e gestão de formulários públicos. Aqui você configura formulários de solicitação, vincula perguntas do banco, define condicionais de exibição e mapeia respostas para os campos do sistema.",
    secoes: [
      {
        titulo: "Aba: Formulários",
        descricao: "Lista todos os formulários cadastrados. Cada formulário pode ser ativado/desativado, editado, configurado com o construtor ou ter suas respostas visualizadas.",
        campos: [
          { nome: "Título", descricao: "Nome de identificação do formulário exibido na listagem e no cabeçalho público.", obrigatorio: true },
          { nome: "Descrição", descricao: "Texto explicativo exibido abaixo do título no formulário público." },
          { nome: "Serviço Vinculado", descricao: "Define a qual serviço este formulário pertence. ESSENCIAL para a geração correta do protocolo (usa o código prefixo do serviço) e para preencher automaticamente o campo 'Serviço Adicional' na solicitação, mesmo sem mapeamento manual do campo 'tipo_operacao'." },
          { nome: "Estilo", descricao: "Estilo visual e funcional do formulário (JBS, Minimal, etc.). Cada estilo tem características próprias de layout e cores." },
          { nome: "Status (Ativo/Inativo)", descricao: "Controla se o formulário está disponível para preenchimento público." },
        ],
        acoes: [
          { nome: "Novo Formulário", descricao: "Cria um formulário com título, descrição, serviço vinculado e estilo." },
          { nome: "Construtor (⚙️)", descricao: "Abre o construtor para adicionar/remover perguntas, configurar condicionais e mapeamentos." },
          { nome: "Ver Respostas (👁️)", descricao: "Visualiza todas as respostas enviadas para o formulário com opção de exportar CSV." },
          { nome: "Editar (✏️)", descricao: "Altera título, descrição, serviço vinculado e estilo." },
          { nome: "Excluir (🗑️)", descricao: "Remove permanentemente o formulário." },
        ],
      },
      {
        titulo: "Construtor do Formulário",
        descricao: "Tela principal de configuração de perguntas. Aqui você monta o formulário selecionando perguntas do banco, define regras de exibição condicional e mapeia respostas para os campos do sistema.",
        subsecoes: [
          {
            titulo: "Perguntas Vinculadas",
            descricao: "Lista as perguntas adicionadas ao formulário, em ordem de exibição. Cada pergunta mostra seu tipo, se é obrigatória, suas condicionais e mapeamentos.",
            campos: [
              { nome: "Obrigatório (Switch)", descricao: "Se ativado, o usuário não pode enviar o formulário sem preencher esta pergunta." },
              { nome: "Ordem (Setas ↑↓)", descricao: "Move a pergunta para cima ou para baixo na lista." },
            ],
          },
          {
            titulo: "Condicionais de Exibição",
            descricao: "Define regras para exibir/ocultar uma pergunta com base na resposta de outra pergunta. Exemplo: mostrar 'Motivo' somente quando 'Tipo' = 'Posicionamento'.",
            campos: [
              { nome: "Pergunta Condicionada", descricao: "Pergunta que será exibida ou ocultada conforme a regra.", obrigatorio: true },
              { nome: "Pergunta Pai", descricao: "Pergunta cuja resposta determina a exibição. NÃO pode ser a mesma que a condicionada.", obrigatorio: true },
              { nome: "Operador", descricao: "'É igual a', 'É diferente de' ou 'Contém'.", obrigatorio: true },
              { nome: "Valor Gatilho", descricao: "Valor da resposta do pai que ativa a exibição da pergunta condicionada.", obrigatorio: true },
            ],
          },
          {
            titulo: "Mapeamentos (CRÍTICO para não perder dados)",
            descricao: "Vincula a resposta de uma pergunta a um campo do sistema. Sem mapeamento, a resposta fica salva apenas no registro bruto do formulário e NÃO aparece nos campos padrão da solicitação. ATENÇÃO: É a etapa mais importante para garantir que os dados apareçam corretamente na página interna.",
            campos: [
              { nome: "Pergunta", descricao: "Pergunta cujo valor será mapeado.", obrigatorio: true },
              { nome: "Tipo de Destino", descricao: "'Campo fixo da solicitação' (ex: Nome, E-mail, Contêiner, CNPJ, Tipo de Carga, Observações, Data, Categoria) OU 'Campo dinâmico de análise' (campos customizáveis criados pelo admin).", obrigatorio: true },
              { nome: "Campo Fixo", descricao: "Se tipo fixo: mapeia para uma coluna direta da solicitação (cliente_nome, cliente_email, numero_conteiner, cnpj, lpco, tipo_carga, data_posicionamento, data_agendamento, observacoes, categoria, tipo_operacao)." },
              { nome: "Campo Dinâmico", descricao: "Se tipo dinâmico: mapeia para um campo de análise criado na aba 'Campos Dinâmicos'. A resposta será salva em 'campos_analise_valores' e exibida na seção 'Campos de Análise' da visualização interna." },
            ],
            acoes: [
              { nome: "Novo Mapeamento", descricao: "Cria vínculo entre pergunta e campo de destino." },
              { nome: "Criar Campo (+)", descricao: "Cria um novo campo dinâmico de análise diretamente do construtor." },
              { nome: "Excluir Mapeamento", descricao: "Remove o vínculo. A resposta continuará salva no registro bruto, mas não será exibida nos campos padrão." },
            ],
          },
        ],
      },
      {
        titulo: "Aba: Perguntas (Banco de Perguntas)",
        descricao: "Repositório centralizado de perguntas reutilizáveis em múltiplos formulários. Cada pergunta é definida uma vez e pode ser vinculada a vários formulários.",
        campos: [
          { nome: "Rótulo", descricao: "Texto da pergunta exibido no formulário público.", obrigatorio: true },
          { nome: "Tipo", descricao: "Define o componente de entrada: Texto, Área de Texto, Seleção (dropdown), Múltipla Escolha (checkboxes), Data, Upload de Arquivo, Informativo, Subtítulo, Pergunta Condicional, Resposta Conjunta, Contêiner (com validação), CNPJ (com máscara).", obrigatorio: true },
          { nome: "Placeholder", descricao: "Texto de exemplo exibido dentro do campo quando vazio." },
          { nome: "Opções", descricao: "Para tipos Seleção e Múltipla Escolha: lista de opções separadas por vírgula." },
          { nome: "Descrição", descricao: "Texto exibido abaixo do rótulo em fonte menor e itálica." },
          { nome: "Configurações (Config)", descricao: "Configurações avançadas em JSON: largura do campo (1-100%), aceite obrigatório (informativo), sub-perguntas (pergunta condicional), etc." },
        ],
      },
      {
        titulo: "Aba: Campos Dinâmicos",
        descricao: "Gerencia campos de análise customizáveis que podem ser vinculados a perguntas via mapeamento. Os valores preenchidos aparecem na seção 'Campos de Análise' da visualização interna do processo.",
        campos: [
          { nome: "Nome", descricao: "Identificador do campo exibido na análise interna.", obrigatorio: true },
          { nome: "Tipo", descricao: "Tipo de dado: Texto, Número, Data, Checkbox, Seleção.", obrigatorio: true },
          { nome: "Serviços Vinculados", descricao: "Define para quais serviços este campo é exibido na análise." },
          { nome: "Obrigatório", descricao: "Se ativado, o campo deve ser preenchido na análise interna." },
          { nome: "Visível Externamente", descricao: "Se ativado, o valor aparece no portal de consulta externa do cliente." },
        ],
      },
      {
        titulo: "Aba: Estilos",
        descricao: "Gerencia os estilos visuais disponíveis para os formulários. Cada estilo define cores, layout e funcionalidades específicas.",
        campos: [
          { nome: "Nome", descricao: "Nome do estilo exibido na seleção.", obrigatorio: true },
          { nome: "Chave", descricao: "Identificador interno do estilo (gerado automaticamente).", obrigatorio: true },
          { nome: "Features", descricao: "Lista de funcionalidades/características do estilo (exibidas como badges)." },
          { nome: "Configuração", descricao: "JSON com cores, fontes e outros parâmetros visuais." },
        ],
      },
      {
        titulo: "⚠️ Guia de Mapeamento (Evitando Perda de Dados)",
        descricao: "RESUMO CRÍTICO: Para que as respostas do formulário apareçam corretamente na página interna:",
        campos: [
          { nome: "1. Vincular Serviço", descricao: "Edite o formulário e selecione o serviço correspondente. Isso garante o protocolo correto (ex: JBSP para Posicionamento) e preenche automaticamente o 'Serviço Adicional'." },
          { nome: "2. Mapear Campos Fixos", descricao: "No construtor, clique em 'Mapeamento' e vincule perguntas como Nome, E-mail, CNPJ, Contêiner aos seus campos fixos correspondentes." },
          { nome: "3. Mapear Campos Dinâmicos", descricao: "Para dados adicionais (ex: Motivo, Quadra, Peso), crie campos dinâmicos e mapeie as perguntas a eles. Os valores aparecem em 'Campos de Análise'." },
          { nome: "4. Respostas Não Mapeadas", descricao: "Perguntas sem mapeamento são exibidas na seção 'Respostas do Formulário' da visualização interna, mas NÃO preenchem campos padrão." },
          { nome: "5. Anexos", descricao: "Arquivos enviados via Upload de Arquivo são salvos automaticamente e exibidos na seção 'Anexos do Formulário' da visualização interna." },
        ],
      },
    ],
  },
];

const AdminParametrosAjuda = () => {
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);

  const handleUpdateManual = async () => {
    setUpdating(true);
    try {
      // Fetch current configuration from database to build dynamic sections
      const [camposFixosRes, camposDinamicosRes, cobrancaRes, pendenciasRes] = await Promise.all([
        supabase.from("campos_fixos_config").select("campo_chave, campo_label, visivel_analise, visivel_externo, obrigatorio_analise").eq("ativo", true).order("ordem"),
        supabase.from("campos_analise").select("nome, tipo, obrigatorio, visivel_externo").eq("ativo", true).order("ordem"),
        supabase.from("lancamento_cobranca_config").select("nome, rotulo_analise, tipo").eq("ativo", true).order("created_at"),
        supabase.from("pendencia_opcoes").select("valor").eq("ativo", true).order("ordem"),
      ]);

      const camposFixos = camposFixosRes.data || [];
      const camposDinamicos = camposDinamicosRes.data || [];
      const cobrancas = cobrancaRes.data || [];
      const pendencias = pendenciasRes.data || [];

      // Build dynamic documentation sections
      const dynamicSections: SecaoDoc[] = [];

      if (camposFixos.length > 0) {
        dynamicSections.push({
          titulo: `Campos Fixos Ativos (${camposFixos.length})`,
          descricao: "Campos nativos do sistema atualmente configurados.",
          campos: camposFixos.map(c => ({
            nome: c.campo_label,
            descricao: `Chave: ${c.campo_chave}. Análise: ${c.visivel_analise ? "Visível" : "Oculto"}${c.obrigatorio_analise ? " (Obrigatório)" : ""}. Externo: ${c.visivel_externo ? "Visível" : "Oculto"}.`,
          })),
        });
      }

      if (camposDinamicos.length > 0) {
        dynamicSections.push({
          titulo: `Campos Dinâmicos de Análise (${camposDinamicos.length})`,
          descricao: "Campos customizáveis criados para a tela de análise.",
          campos: camposDinamicos.map(c => ({
            nome: c.nome,
            descricao: `Tipo: ${c.tipo}. ${c.obrigatorio ? "Obrigatório." : "Opcional."} Externo: ${c.visivel_externo ? "Visível" : "Oculto"}.`,
          })),
        });
      }

      if (cobrancas.length > 0) {
        dynamicSections.push({
          titulo: `Gerenciamento de Lançamento de Cobranças (${cobrancas.length})`,
          descricao: "Configurações de lançamento de cobrança ativas no sistema.",
          campos: cobrancas.map(c => ({
            nome: c.rotulo_analise,
            descricao: `Nome interno: ${c.nome}. Tipo: ${c.tipo === "servico" ? "Serviço" : c.tipo === "pendencia" ? "Pendência" : c.tipo}.`,
          })),
        });
      }

      if (pendencias.length > 0) {
        dynamicSections.push({
          titulo: `Opções de Pendência (${pendencias.length})`,
          descricao: "Pendências disponíveis para seleção na análise de processos.",
          campos: pendencias.map(p => ({
            nome: p.valor,
            descricao: "Opção de pendência ativa.",
          })),
        });
      }

      // Update the Pág. Interna section with dynamic data
      const pagInternaIdx = DOCUMENTACAO.findIndex(d => d.id === "pagina-interna");
      if (pagInternaIdx >= 0 && dynamicSections.length > 0) {
        DOCUMENTACAO[pagInternaIdx].secoes = [
          ...DOCUMENTACAO[pagInternaIdx].secoes.filter(s => !s.titulo.startsWith("Campos Fixos Ativos") && !s.titulo.startsWith("Campos Dinâmicos") && !s.titulo.startsWith("Gerenciamento de Lançamento") && !s.titulo.startsWith("Opções de Pendência")),
          ...dynamicSections,
        ];
      }

      toast.success(`Manual atualizado! ${camposFixos.length} campos fixos, ${camposDinamicos.length} campos dinâmicos, ${cobrancas.length} cobranças sincronizados.`);
    } catch (err) {
      toast.error("Erro ao atualizar manual.");
    }
    setUpdating(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interno/admin/parametros")} title="Voltar para Parâmetros">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Manual de Parâmetros do Sistema</h1>
          </div>
        </div>
        <Button onClick={handleUpdateManual} disabled={updating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`} />
          {updating ? "Atualizando..." : "Atualizar Manual"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground px-2 uppercase tracking-wider">Módulos</p>
          <nav className="space-y-1">
            {DOCUMENTACAO.map((aba) => (
              <a
                key={aba.id}
                href={`#${aba.id}`}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary/70">{aba.icone}</span>
                {aba.titulo}
              </a>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <ScrollArea className="h-[calc(100vh-120px)] pr-6">
          <div className="space-y-10 pb-20">
            {DOCUMENTACAO.map((aba) => (
              <section key={aba.id} id={aba.id} className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {aba.icone}
                  </div>
                  <h2 className="text-2xl font-bold">{aba.titulo}</h2>
                </div>
                <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                  {aba.descricao}
                </p>

                <div className="grid gap-6">
                  {aba.secoes.map((secao, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-lg">{secao.titulo}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <p className="text-muted-foreground">{secao.descricao}</p>

                        {secao.campos && secao.campos.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <List className="h-4 w-4 text-primary" />
                              Campos Disponíveis
                            </h4>
                            <div className="space-y-3">
                              {secao.campos.map((campo, cIdx) => (
                                <div key={cIdx} className="border-l-2 border-muted pl-3 py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{campo.nome}</span>
                                    {campo.obrigatorio && <Badge variant="secondary" className="text-[10px]">Obrigatório</Badge>}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5">{campo.descricao}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {secao.acoes && secao.acoes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Settings className="h-4 w-4 text-primary" />
                              Ações Disponíveis
                            </h4>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {secao.acoes.map((acao, aIdx) => (
                                <div key={aIdx} className="bg-muted/30 p-3 rounded-md">
                                  <span className="font-semibold text-sm block mb-1">{acao.nome}</span>
                                  <p className="text-xs text-muted-foreground">{acao.descricao}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {secao.subsecoes && secao.subsecoes.map((sub, sIdx) => (
                          <div key={sIdx} className="mt-6 pt-6 border-t">
                            <h4 className="font-semibold text-base mb-2">{sub.titulo}</h4>
                            <p className="text-sm text-muted-foreground mb-4">{sub.descricao}</p>
                            
                            {sub.campos && (
                              <div className="space-y-2">
                                {sub.campos.map((campo, scIdx) => (
                                  <div key={scIdx} className="text-sm grid grid-cols-[180px_1fr] gap-2 items-baseline">
                                    <span className="font-medium text-foreground/80">{campo.nome}:</span>
                                    <span className="text-muted-foreground">{campo.descricao}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AdminParametrosAjuda;
