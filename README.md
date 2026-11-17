# Pomodoro — Gestão de Foco

Aplicação web para organizar sessões de estudo com a técnica Pomodoro e gerenciar tarefas. Desenvolvida com **React e TypeScript**, com interface em português, layout responsivo e persistência local no navegador.

## Funcionalidades

- Criação, edição, exclusão e seleção de temporizadores personalizados.
- Sessões com foco, pausa curta e pausa longa.
- Controles para pausar, retomar, pular fase, reiniciar ciclos e encerrar sessão.
- Restauração automática da sessão por timestamps, com opção de descarte.
- Bloqueio de edição e exclusão do temporizador em uso.
- Tarefas com título, estado e prioridade, ordenadas automaticamente.
- Confirmações de exclusão em janelas que acompanham o tema da aplicação.
- Alerta sonoro ao término natural das fases.
- Tema claro e escuro.
- Som ambiente opcional: chuva, ondas do mar e ruído marrom, com controle de volume e painel recolhível.

## Requisitos para executar

- **Node.js 22.12 ou superior**, com npm instalado.
- Um navegador moderno com suporte a JavaScript, Local Storage e Web Audio.
- Git, caso o projeto seja obtido por clonagem. Também é possível baixar e extrair o ZIP do repositório.
- Conexão com a internet para instalar as dependências na primeira execução.

Não é necessário configurar banco de dados, backend, conta de usuário, chaves de API ou variáveis de ambiente.

Para conferir se Node.js e npm estão disponíveis:

```bash
node --version
npm --version
```

## Como executar

1. Clone o repositório público ou baixe e extraia seu ZIP.
2. Abra um terminal na pasta que contém o arquivo `package.json` da aplicação.
3. Instale as dependências:

    ```bash
    npm ci
    ```

4. Inicie o servidor de desenvolvimento:

    ```bash
    npm run dev
    ```

5. Abra no navegador o endereço exibido no terminal, normalmente **http://localhost:5173**. Se a porta estiver ocupada, utilize a porta indicada pelo Vite.

Mantenha o terminal aberto durante o uso. Para encerrar o servidor, pressione **Ctrl+C**. Não abra `index.html` diretamente pelo explorador de arquivos.

Com o servidor de desenvolvimento em execução, alterações salvas nos arquivos-fonte são refletidas automaticamente na página. Se o servidor for encerrado, execute `npm run dev` novamente. O comando `npm ci` não precisa ser repetido a cada alteração; use-o novamente quando precisar reinstalar as dependências conforme o arquivo de versões do projeto.

### Acessar pelo celular

Conecte o computador e o celular à mesma rede Wi-Fi. Na pasta da aplicação, execute:

```bash
npm run dev -- --host 0.0.0.0
```

Abra no celular o endereço **Network** exibido pelo terminal, utilizando o IP do computador e a porta informada. O computador deve continuar ligado e com o servidor em execução. Caso o acesso seja bloqueado, confira as permissões do firewall e se a rede permite comunicação entre os dispositivos.

### Gerar e visualizar a versão de produção

```bash
npm run build
npm run preview
```

O build verifica o TypeScript e gera os arquivos finais na pasta `dist/`. O preview permite conferi-los no endereço exibido no terminal, normalmente **http://localhost:4173**.

Após alterações no código, execute o build novamente para atualizar a versão de produção. O comando de preview serve para conferência local; para disponibilizar a aplicação na internet, os arquivos de `dist/` devem ser publicados em uma hospedagem de arquivos estáticos. Hospedar a aplicação não é necessário para executá-la localmente nem substitui a entrega do código em repositório público.

## Comandos disponíveis

| Comando                | Finalidade                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm ci`               | Instalar as versões registradas no `package-lock.json`.                 |
| `npm run dev`          | Executar o ambiente de desenvolvimento com atualização automática.      |
| `npm test`             | Executar os testes automatizados de sessões, ordenação e alerta sonoro. |
| `npm run build`        | Verificar o TypeScript e gerar a versão de produção.                    |
| `npm run preview`      | Visualizar localmente o último build gerado.                            |
| `npm run format`       | Formatar o código-fonte e a documentação com Prettier.                  |
| `npm run format:check` | Conferir a formatação sem alterar os arquivos.                          |

## Decisões técnicas adotadas

| Decisão                                 | Justificativa                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **React e TypeScript**                  | Atender à stack obrigatória, construir a interface com componentes e utilizar tipagem para os dados da aplicação.                                                              |
| **Vite**                                | Disponibilizar servidor de desenvolvimento com atualização automática e gerar os arquivos de produção.                                                                         |
| **Local Storage**                       | Atender à persistência exclusivamente local, sem backend, autenticação ou sincronização remota. Os objetos são armazenados em JSON.                                            |
| **Timestamps absolutos**                | Calcular o tempo restante pelo horário previsto de término da fase, evitando depender da precisão dos intervalos do navegador. Ao reabrir, as fases vencidas são recalculadas. |
| **Snapshot do temporizador**            | Copiar os parâmetros ao iniciar uma sessão para manter sua configuração independente do cadastro original.                                                                     |
| **CSS próprio**                         | Implementar responsividade e temas com media queries e variáveis CSS, sem biblioteca de estilos.                                                                               |
| **Web Audio API**                       | Gerar o alerta e os ambientes no navegador, sem arquivos de áudio externos, serviços de terceiros ou chaves de acesso. O som ambiente é uma extensão opcional do escopo.       |
| **Diálogos nativos de HTML (`dialog`)** | Apresentar formulários e confirmações com aparência personalizada, suporte a teclado e foco modal.                                                                             |
| **Separação de responsabilidades**      | Manter regras do domínio, persistência, áudio e interface em arquivos próprios.                                                                                                |
| **Prettier e EditorConfig**             | Padronizar a formatação com indentação de quatro espaços.                                                                                                                      |

### Documento de requisitos

- **Duração de uma sessão:** são executados os focos configurados, com pausas curtas entre eles e uma pausa longa final. Após essa pausa longa, a sessão é concluída.
- **Pulo de fase:** avança a etapa da sequência sem incrementar o contador de focos concluídos. O número do ciclo exibido é calculado pela posição dessa etapa; essa interpretação deve ser alinhada com a equipe docente caso seja exigida outra leitura da RN-03.
- **Modelo da sessão:** a implementação deriva fase e ciclo de um índice de etapa. Os nomes e campos persistidos não reproduzem integralmente o modelo conceitual da seção 11.2; por exemplo, a sessão ainda não possui campos próprios de criação e atualização.

## Organização do código

```text
src/
├── components/
│   ├── AmbientPlayer.tsx   # Painel recolhível de som ambiente
│   ├── ConfirmDialog.tsx   # Confirmação reutilizável
│   └── DeleteDialog.tsx    # Confirmação de exclusão
├── hooks/
│   └── usePhaseAlert.ts    # Estado e ativação do alerta sonoro
├── ambient.ts             # Síntese e controle dos ambientes
├── audio.ts               # Reprodução dos bipes de fim de fase
├── audio.test.ts          # Testes do alerta
├── domain.ts              # Tipos, validação, sessões e ordenação
├── domain.test.ts         # Testes das regras de domínio
├── main.tsx               # Interface principal e integração dos controles
├── storage.ts             # Leitura validada e persistência local
├── style.css              # Estilos, temas e responsividade
└── theme.ts               # Carregamento e aplicação do tema
```

Na raiz, `index.html` é a entrada da aplicação, `package.json` define dependências e comandos, `package-lock.json` registra as versões instaladas e `tsconfig.json` configura a verificação TypeScript.

Edite os arquivos de `src/`. Os arquivos de `dist/` são gerados pelo build, e `node_modules/` contém as dependências instaladas. A formatação automática padrão ignora essas duas pastas; o build gera arquivos compactados em `dist/`.

## Persistência e limitações

| Chave do Local Storage | Conteúdo                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `pomodoro.presets`     | Temporizadores personalizados.                             |
| `pomodoro.tarefas`     | Tarefas e seus estados e prioridades.                      |
| `pomodoro.sessaoAtiva` | Snapshot, etapa, status e informações temporais da sessão. |
| `pomodoro.tema`        | Preferência de tema.                                       |
| `pomodoro.ambiente`    | Ambiente escolhido e volume.                               |

Os dados pertencem ao navegador e à origem utilizada, incluindo endereço e porta. Limpar o armazenamento ou trocar de navegador, dispositivo ou origem não transfere os dados. Não há sincronização entre abas abertas simultaneamente; recomenda-se utilizar uma aba por vez.

Uma sessão pausada permanece pausada após reabrir a página. As falhas de leitura e gravação são sinalizadas ao usuário, e existe uma opção de descarte de dados inválidos. A validação de consistência dos dados carregados ainda pode ser ampliada.

O áudio depende de interação do usuário e das políticas do navegador. Use **Ativar som** para liberar o alerta. O ambiente começa pausado ao reabrir a página; suas preferências são recuperadas, mas a reprodução exige um novo clique. O alerta e o ambiente possuem controles independentes. Não há reprodução com o navegador fechado, e o sistema pode suspender o áudio em segundo plano ou com a tela bloqueada.

Os limites dos campos são aplicados nos formulários, mas algumas mensagens de validação são fornecidas pelo navegador e podem seguir seu idioma. A compatibilidade entre diferentes navegadores, a acessibilidade completa e o limite de resposta de 100 ms exigem validação específica antes de afirmar conformidade integral com os requisitos.
