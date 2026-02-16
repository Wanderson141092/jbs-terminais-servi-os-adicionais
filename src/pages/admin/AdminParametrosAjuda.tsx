import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Globe, Eye, List, Settings, GitBranch, Ban, Clock, Bell, FileText, Link2, Shield, HelpCircle, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
          { nome: "Aplica dia anterior", descricao: "Se ativado, a regra de corte se aplica com base no dia anterior ao dia de atendimento." },
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
];

const AdminParametrosAjuda = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/interno/admin/parametros")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Manual de Parâmetros do Sistema</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Documentação completa de todas as abas, campos e ações disponíveis na tela de Parâmetros do Sistema.
        Cada seção explica a finalidade e o funcionamento dos campos e botões.
      </p>

      <div className="space-y-8">
        {DOCUMENTACAO.map((aba) => (
          <Card key={aba.id} id={aba.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {aba.icone}
                {aba.titulo}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{aba.descricao}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {aba.secoes.map((secao, si) => (
                <div key={si} className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-base">{secao.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{secao.descricao}</p>
                  </div>

                  {secao.campos && secao.campos.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2 font-medium w-1/4">Campo</th>
                            <th className="text-left px-3 py-2 font-medium">Descrição</th>
                          </tr>
                        </thead>
                        <tbody>
                          {secao.campos.map((campo, ci) => (
                            <tr key={ci} className="border-t">
                              <td className="px-3 py-2 font-medium align-top">
                                {campo.nome}
                                {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{campo.descricao}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {secao.acoes && secao.acoes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ações disponíveis</p>
                      <div className="space-y-1">
                        {secao.acoes.map((acao, ai) => (
                          <div key={ai} className="flex gap-2 text-sm">
                            <Badge variant="outline" className="shrink-0 text-xs">{acao.nome}</Badge>
                            <span className="text-muted-foreground">{acao.descricao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {secao.subsecoes && secao.subsecoes.map((sub, subi) => (
                    <div key={subi} className="ml-4 border-l-2 border-muted pl-4 space-y-2">
                      <h4 className="font-medium text-sm">{sub.titulo}</h4>
                      <p className="text-xs text-muted-foreground">{sub.descricao}</p>
                      {sub.campos && sub.campos.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left px-3 py-1.5 font-medium text-xs w-1/4">Campo</th>
                                <th className="text-left px-3 py-1.5 font-medium text-xs">Descrição</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sub.campos.map((campo, ci) => (
                                <tr key={ci} className="border-t">
                                  <td className="px-3 py-1.5 font-medium text-xs align-top">
                                    {campo.nome}
                                    {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
                                  </td>
                                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{campo.descricao}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {sub.acoes && sub.acoes.length > 0 && (
                        <div className="space-y-1">
                          {sub.acoes.map((acao, ai) => (
                            <div key={ai} className="flex gap-2 text-xs">
                              <Badge variant="outline" className="shrink-0 text-[10px]">{acao.nome}</Badge>
                              <span className="text-muted-foreground">{acao.descricao}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {si < aba.secoes.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        <p className="font-semibold mb-1">Campos marcados com <span className="text-destructive">*</span> são obrigatórios.</p>
        <p>Esta página é atualizada automaticamente sempre que novas abas ou ações são adicionadas aos Parâmetros do Sistema.</p>
      </div>
    </div>
  );
};

export default AdminParametrosAjuda;
