## CARRIER SCRIPT
Esse script foi criado com o intuito de auxiliar o cadastradamento de motoristas e veiculos da iniciativa na CFDI 4.0

## STACK TECNOLOGICO
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Yarn](https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white)

## :gear: PRIMEIROS PASSOS
Esse projeto foi desenvolvido utilizando ***NodeJS v16.17.0*** e ***Yarn v1.22.19***. Sendo assim é bom certificar-se que a sua versão atual seja equivalente ou superior.

##### Verificando as versões
<pre><code>node -v</code></pre>

<pre><code>yarn -v</code></pre>

Caso você não tenha alguma das ferramentas, utilize o ***Homebrew*** para fazer a instalação.

### Instalação NodeJS
Caso você já tenha o NodeJS instalado previamente, é necessario antes fazer sua desvinculação para vincular uma versão mais recente.

*Se não tiver basta pular esse passo*
<pre><code>brew unlink node</code></pre>

E então instale a versão desejada:
<pre><code>brew install node@16</code></pre>


Agora você pode vincular uma versão diferente:
<pre><code>brew link node@16</code></pre>


### Instalação Yarn
<pre><code>brew install yarn</code></pre>


### Configurando o projeto
Após isso clone normalmente o projeto e ***dentro da pasta root*** instale as dependencias
<pre><code>yarn install</code></pre>

E com isso você pode utilizar com a IDE de sua preferencia

## :clipboard: NORMALIZAÇÃO
Antes de começar a cadastrar motoristas e/ou veiculos é necessario fazer a *normalização* da planilha, ou seja, remover a estilização atual e torna-la no formato comum para facilitar a manipulação de dados

1. Baixe a planilha em formato ```.xlsx```

https://user-images.githubusercontent.com/96149487/208107589-6141a0b2-ef96-4549-80c9-1626b831fd18.mp4

2. Insira a planilha na pasta do projeto e renomeie o arquivo adicionando o sufixo *_non_normalized*

https://user-images.githubusercontent.com/96149487/208109851-22669c99-69c2-4901-97e5-d93221621cef.mp4

3. Com a planilha dentro do projeto descubra o diretorio atual, e depois insira o nome do carrier na função ```init()``` com isso execute o script

https://user-images.githubusercontent.com/96149487/208113089-e9a3b16d-ca48-424b-933e-16bb4ad3aa10.mp4


## :pilot: FLUXO DRIVER
Aqui é onde vamos **cadastrar** os motoristas

:warning: VERIFIQUE SE A **VPN** ESTÁ HABILITADA :warning:

##### :file_folder: ```converted_sheet```

Aqui ficarão os arquivos ```.json``` resultantes da conversão da planilha ```.xlsx```

##### :file_folder: ```divergent_driver```

Aqui ficarão os arquivos onde estarão drivers que não foram adicionados na planilha que enviamos para o carrier preencher

##### :file_folder: ```drivers_with_divergent_rfc```

Aqui ficarão os arquivos onde estarão drivers que estão com a RFC (da planilha) diferente da base

##### :file_folder: ```drivers_without_rfc```
Aqui ficarão os arquivos onde estarão drivers que estão sem a RFC

https://user-images.githubusercontent.com/96149487/208119532-d56cf9c2-b956-479f-b015-dfbb86e08d52.mp4

## :truck: FLUXO VEHICLE
Aqui é onde vamos **atualizar** os veiculos

:warning: VERIFIQUE SE A **VPN** ESTÁ HABILITADA :warning:

##### :file_folder: ```converted_sheet```

Aqui ficarão os arquivos ```.json``` resultantes da conversão da planilha ```.xlsx```

##### :file_folder: ```backup_vehicle```

Aqui ficarão os arquivos resultantes dos veiculos previamente cadastrados, de forma a podermos restaurar a informação em caso de erros

##### :file_folder: ```result_updated```

Aqui ficarão os arquivos ```.txt``` resultantes da atualização das informações dos veiculos atualizados com sucesso.

https://user-images.githubusercontent.com/96149487/208126222-0e7e8c29-9ffe-48bb-898a-75ee2f48d870.mp4


#### CONTATO
| everton.vsilva@mercadolivre.com | ![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white) |
|----------|:-------------:|
| @Everton De Souza Silva | ![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white) |




