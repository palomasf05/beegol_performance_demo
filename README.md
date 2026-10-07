# Portal Beegol

Cópia independente com logo oficial em SVG, identidade azul, login próprio e consulta de dados de demonstração.

## Iniciar no computador

Execute `iniciar_portal.ps1`, ou execute `node server.js` na pasta do projeto. Abra `http://127.0.0.1:4317`. O usuário e a senha local estão em `ACESSO_LOCAL.md`. A prévia já está em execução no computador onde a cópia foi preparada.

## Power BI

`dashboard.html` incorpora o relatório indicado pelo responsável. O link está configurado em `PUBLIC_BI_URL` no arquivo `.env`. O dashboard usa somente o embed Power BI. Não há painel de indicadores construído no portal.

O relatório incorporado foi aberto e a capa Beegol foi conferida. Trocar as bases locais não atualiza o conjunto de dados do Power BI: atualização, filtros e páginas do relatório são controlados no Power BI. As bases demo em `sources/` estão disponíveis para atualizar a origem do relatório.

## Consulta e exportação

A pasta `data/` foi reconstruída a partir do Excel demo: 591.630 registros, 543 municípios e 494 códigos de OLT mascarados. A consulta carrega apenas o bloco compactado do município selecionado e mantém o filtro por OLT e o botão de CSV.

Os documentos, IDs e códigos de OLT são fictícios. Métricas, cidades e coordenadas reais foram preservadas. Uma referência à operadora em um endereço descritivo foi neutralizada também na cópia interna, sem deslocar a localização.

## Bases internas

- `sources/base_mpes_demo.xlsx`: base demo de empresas, com os cabeçalhos originais.
- `sources/cubo_demo.csv`: cubo demo, com os cabeçalhos originais e 2.522 linhas.

Os nomes de colunas foram mantidos por escolha do responsável para compatibilidade com as consultas e medidas existentes. Os rótulos exibidos na consulta são próprios da demonstração. As bases internas não são servidas pelo servidor local e estão excluídas dos arquivos estáticos de publicação.

## Configuração

O arquivo `.env` da operação de origem não foi copiado. Esta cópia tem seu próprio `SESSION_SECRET`, seu próprio `PORTAL_USERS` e o link Power BI informado. Nunca distribua a configuração privada para os visitantes do portal.

Para publicar na Vercel, configure `SESSION_SECRET`, `PORTAL_USERS` e `PUBLIC_BI_URL` nas variáveis de ambiente do novo projeto. `vercel.json` direciona os downloads de dados à API autenticada e inclui os blocos na função. As opções de roteamento e `includeFiles` seguem a [documentação de configuração da Vercel](https://vercel.com/docs/project-configuration/vercel-json). A publicação não foi executada; os testes foram locais.

## Reconstruir a consulta

Com Python disponível, execute `python scripts/build_demo_data.py sources/base_mpes_demo.xlsx sources/cubo_demo.csv`. Use a pasta `work/city_csv` vazia. O construtor preserva os cabeçalhos da base interna e prepara somente os campos utilizados na consulta.

## Verificação

Os blocos gzip de todos os municípios foram descompactados e tiveram suas contagens e campos conferidos. Logo oficial comparado por SHA-256. Login, bloqueio das fontes internas, leitura por intervalo de bytes e filtro sem resultados foram verificados. A serialização do CSV foi conferida em teste; a captura automática do download no navegador do aplicativo não retornou o arquivo.

O portal de origem permaneceu intacto. PDFs, temporários, cache, logos e dados compactados da identidade anterior não foram incluídos na nova cópia.
