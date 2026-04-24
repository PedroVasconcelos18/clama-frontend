import { Link } from "react-router-dom"
import { StickyNav } from "@/components/clama/StickyNav"
import { Footer } from "@/components/clama/Footer"

const VERSAO = "1.0"
const DATA_VIGENCIA = "abril de 2026"

export default function Termos() {
  return (
    <div className="min-h-screen bg-clama-cream">
      <StickyNav />

      {/* Content */}
      <main className="max-w-prose mx-auto px-4 py-12">
        <article className="prose prose-lg">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="font-serif text-clama-night text-2xl mb-2">Clama.</p>
            <p className="text-clama-night/60 text-sm mb-8">
              Plataforma de Conteúdo de Apoio Espiritual Digital
            </p>
            <h1 className="font-serif text-clama-night text-3xl mb-4">
              Termos de Uso e Condições Gerais do Serviço
            </h1>
            <p className="text-sm text-clama-text-soft">
              Versão {VERSAO} | Vigência: a partir de {DATA_VIGENCIA}
            </p>
          </div>

          {/* Aviso inicial */}
          <div className="bg-clama-night/5 border border-clama-border rounded-lg p-4 mb-8">
            <p className="text-clama-night/80 text-sm font-medium">
              <strong>LEIA COM ATENÇÃO:</strong> Ao utilizar a plataforma Clama, você declara ter lido, compreendido e concordado integralmente com os presentes Termos de Uso. Caso não concorde com qualquer disposição, não utilize o serviço.
            </p>
          </div>

          {/* Seção 1 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">1. Das Partes e Definições</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">1.1 Identificação da prestadora de serviço</h3>
          <p className="text-clama-night/80 mb-4">
            A plataforma Clama (doravante denominada simplesmente "Clama" ou "Plataforma") é operada por pessoa jurídica constituída no Brasil, nos termos da legislação civil e empresarial vigente, com atividade principal classificada como prestação de serviços digitais de produção e entrega de conteúdo textual de natureza motivacional e espiritual.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">1.2 Definições essenciais</h3>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-6">
            <li><strong>Usuário:</strong> pessoa física, maior de 18 anos, que acessa e utiliza a Plataforma mediante aceite destes Termos.</li>
            <li><strong>Serviço:</strong> produção e entrega de conteúdo textual digital de apoio espiritual, elaborado com auxílio de inteligência artificial, sem natureza religiosa vinculante, confessional ou sacramental.</li>
            <li><strong>Conteúdo Gerado:</strong> texto de caráter espiritual motivacional, produzido de forma automatizada a partir das informações fornecidas pelo Usuário, entregue exclusivamente por meios digitais (e-mail ou mensagem).</li>
            <li><strong>Pedido:</strong> solicitação formal do Usuário à geração de um Conteúdo Gerado, mediante o preenchimento do formulário eletrônico e o pagamento da contribuição correspondente.</li>
            <li><strong>Contribuição:</strong> valor pago pelo Usuário como contraprestação pelo Serviço digital, a partir do mínimo de R$ 5,99 (cinco reais e noventa e nove centavos), não configurando doação, dízimo, oferta religiosa ou qualquer obrigação de natureza confessional.</li>
          </ul>

          {/* Seção 2 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">2. Natureza do Serviço</h2>
          <p className="text-clama-night/80 mb-4">
            O Clama é uma plataforma de tecnologia que presta exclusivamente serviços de criação e entrega de conteúdo textual digital de apoio espiritual motivacional. Não se trata de instituição religiosa, denominação cristã, entidade confessional, serviço de aconselhamento psicológico, serviço médico ou qualquer forma de prestação religiosa sacramental.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">2.1 O que o serviço é</h3>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-4">
            <li>Plataforma tecnológica de produção de conteúdo textual motivacional e espiritual por inteligência artificial</li>
            <li>Serviço de entrega de texto de apoio pessoal com linguagem de inspiração cristã protestante</li>
            <li>Produto digital de natureza informacional e motivacional, sem vínculo confessional ou eclesiológico</li>
            <li>Ferramenta de bem-estar emocional e espiritual baseada em conteúdo textual</li>
          </ul>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">2.2 O que o serviço NÃO é</h3>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-4">
            <li>Não é uma igreja, denominação religiosa, ministério ou organização confessional de qualquer natureza</li>
            <li>Não é serviço de aconselhamento psicológico, psiquiátrico, terapêutico ou de saúde mental</li>
            <li>Não é serviço médico, nutricional, jurídico, financeiro ou de qualquer outra profissão regulamentada</li>
            <li>Não realiza curas, livramentos, unções, ordenações ou qualquer ato de natureza sacramental</li>
            <li>Não garante a ocorrência de qualquer evento sobrenatural, milagre, bênção ou resposta divina</li>
            <li>Não representa, em nenhuma hipótese, intercessão religiosa com efeito jurídico ou teológico vinculante</li>
          </ul>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-clama-night/80 text-sm">
              <strong>AVISO IMPORTANTE:</strong> O Conteúdo Gerado pela plataforma Clama tem exclusivamente finalidade motivacional, inspiracional e de apoio emocional. Nenhum texto gerado constitui promessa, profecia, garantia ou compromisso de ocorrência de qualquer evento de natureza espiritual, material ou sobrenatural.
            </p>
          </div>

          {/* Seção 3 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">3. Cadastro e Acesso</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">3.1 Requisitos de cadastro</h3>
          <p className="text-clama-night/80 mb-4">
            Para utilizar o Serviço, o Usuário deve: (i) ser pessoa física com capacidade civil plena, assim entendida a maioridade civil (18 anos completos) ou a emancipação legal nos termos do art. 5º, parágrafo único, do Código Civil; (ii) fornecer nome completo, endereço de e-mail válido e número de telefone celular ativo, que constituem os dados mínimos necessários à execução do Serviço e à entrega do Conteúdo Gerado; (iii) opcionalmente, informar idade e sexo, cuja coleta tem por finalidade exclusiva a personalização do Conteúdo Gerado, sendo o Usuário inteiramente livre para não fornecê-los sem que isso implique impedimento ao acesso ao Serviço; e (iv) realizar o pagamento da Contribuição antes da geração e entrega do Conteúdo.
          </p>
          <p className="text-clama-night/80 mb-4">
            O conteúdo do Pedido formulado pelo Usuário, por sua natureza, pode revelar informações de cunho emocional, espiritual, religioso ou relativo à saúde mental. Tais informações são classificadas como dados sensíveis nos termos do art. 5º, inciso II, da Lei nº 13.709/2018 (LGPD), e tratadas com fundamento no consentimento específico e destacado do Usuário, manifestado no ato do cadastro, conforme exigência do art. 11 da mesma lei. O tratamento dessas informações ocorre exclusivamente para a finalidade de geração e entrega do Conteúdo solicitado, sendo vedado qualquer uso secundário sem nova manifestação de consentimento.
          </p>
          <p className="text-clama-night/80 mb-4">
            O tratamento de dados pessoais realizado pela Clama observa as disposições da Lei nº 13.709/2018 (LGPD). O canal de contato para exercício dos direitos do titular e esclarecimentos sobre o tratamento de dados está disponível em:{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>. A Política de Privacidade completa e atualizada está disponível em:{" "}
            <Link to="/privacidade" className="text-clama-accent hover:underline">clama.me/privacidade</Link>.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">3.2 Responsabilidade pelas informações</h3>
          <p className="text-clama-night/80 mb-4">
            O Usuário declara e garante que todas as informações fornecidas no ato do cadastro são verdadeiras, precisas, atuais e completas. O Clama não se responsabiliza por erros de entrega do Conteúdo Gerado decorrentes de informações incorretas, como endereço de e-mail inválido ou número de celular errado, fornecidos pelo Usuário.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">3.3 Privacidade e sigilo do pedido</h3>
          <p className="text-clama-night/80 mb-6">
            O conteúdo do Pedido formulado pelo Usuário é tratado com estrita confidencialidade. As informações pessoais e o texto do pedido não serão compartilhados com terceiros, utilizados para fins publicitários ou divulgados sob qualquer forma, salvo por determinação judicial ou obrigação legal expressa. A Política de Privacidade completa encontra-se disponível no site da Plataforma.
          </p>

          {/* Seção 4 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">4. Do Conteúdo Gerado</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">4.1 Processo de geração</h3>
          <p className="text-clama-night/80 mb-4">
            O Conteúdo Gerado é produzido de forma automatizada por sistema de inteligência artificial, com base nas informações e no pedido fornecidos pelo Usuário no formulário eletrônico. O texto é elaborado com linguagem de inspiração cristã e estrutura motivacional, não sendo revisado, validado ou endossado por ministro religioso, psicólogo, médico ou qualquer outro profissional habilitado.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">4.2 Limitações expressas do conteúdo</h3>
          <p className="text-clama-night/80 mb-2">O Conteúdo Gerado:</p>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-4">
            <li>Não constitui diagnóstico médico, prescrição de tratamento ou orientação de saúde</li>
            <li>Não substitui acompanhamento psicológico, psiquiátrico ou qualquer forma de terapia</li>
            <li>Não representa conselho jurídico, financeiro, previdenciário ou profissional de qualquer espécie</li>
            <li>Não configura profecia, palavra direta de Deus, revelação divina ou comunicação sobrenatural</li>
            <li>Não garante resultado específico de qualquer natureza, seja espiritual, financeira, relacional ou de saúde</li>
            <li>Não substitui práticas religiosas pessoais, orientação pastoral ou participação em comunidade de fé</li>
          </ul>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">4.3 Uso responsável</h3>
          <p className="text-clama-night/80 mb-6">
            O Usuário reconhece que o Conteúdo Gerado tem natureza exclusivamente motivacional e inspiracional. Em caso de situações de crise emocional, risco à vida, sofrimento psíquico intenso, doenças físicas ou qualquer circunstância que exija atenção especializada, o Usuário deve buscar imediatamente auxílio de profissionais de saúde qualificados, serviços de emergência (SAMU 192, CVV 188) ou instituições competentes.
          </p>

          {/* Seção 5 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">5. Da Contribuição e Política de Pagamento</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">5.1 Valor e modalidades</h3>
          <p className="text-clama-night/80 mb-4">
            A Contribuição mínima para acesso ao Serviço é de R$ 5,99 (cinco reais e noventa e nove centavos). O Clama disponibiliza opções sugeridas pelos planos vigentes e valor livre a critério do Usuário, sempre observado o mínimo estabelecido. Os pagamentos são processados por plataforma de pagamentos certificada (Asaas), mediante cartão de crédito, débito ou Pix.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">5.2 Natureza da contribuição</h3>
          <p className="text-clama-night/80 mb-4">
            O valor pago pelo Usuário constitui contraprestação por serviço digital já prestado no ato da entrega do Conteúdo Gerado. Não se trata, em nenhuma hipótese, de doação, oferta, dízimo, primícia ou qualquer contribuição de natureza religiosa, caritativa ou filantrópica. A relação jurídica estabelecida é exclusivamente de consumo, regida pelo Código de Defesa do Consumidor (Lei nº 8.078/1990) e pela legislação aplicável a serviços digitais.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">5.3 Política de reembolso</h3>
          <p className="text-clama-night/80 mb-4">
            Em razão da natureza do Serviço, não há direito a reembolso após a geração e entrega do Conteúdo Gerado ao endereço de e-mail ou número de celular informado pelo Usuário. A exclusão do direito de arrependimento fundamenta-se em dois pilares jurídicos cumulativos.
          </p>
          <p className="text-clama-night/80 mb-4">
            O primeiro fundamento é o art. 49, parágrafo único, do Código de Defesa do Consumidor (Lei nº 8.078/1990), que afasta o direito de arrependimento para bens digitais entregues com consentimento expresso do consumidor antes do término do prazo legal de reflexão de sete dias. O Usuário presta esse consentimento de forma inequívoca ao clicar em "Gerar minha oração" e efetuar o pagamento, tendo sido prévia e claramente informado sobre a natureza digital e imediata do Serviço.
          </p>
          <p className="text-clama-night/80 mb-4">
            O segundo fundamento reside na natureza personalizada do Conteúdo Gerado. Cada texto produzido pela Plataforma é elaborado exclusivamente com base nas informações pessoais fornecidas pelo Usuário em seu pedido específico, sendo o produto resultante único, intransferível e materialmente inviável para revenda ou reutilização por qualquer outro consumidor. Nessas condições, a lógica protetiva que sustenta o direito de arrependimento — qual seja, permitir ao consumidor desfazer negócio cujo produto pode ser devolvido ao estoque do fornecedor — não se aplica à espécie.
          </p>
          <p className="text-clama-night/80 mb-6">
            O reembolso será concedido exclusivamente nas seguintes hipóteses: (i) falha técnica comprovada que impeça a entrega do Conteúdo Gerado após confirmação do pagamento, desde que o Usuário reporte a falha em até 48 horas pelo canal oficial de suporte; ou (ii) cobrança em duplicidade devidamente comprovada.
          </p>

          {/* Seção 6 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">6. Das Obrigações e Responsabilidades</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">6.1 Obrigações do Usuário</h3>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-4">
            <li>Fornecer informações verdadeiras e atualizadas no cadastro e no pedido</li>
            <li>Utilizar o Serviço para fins pessoais e lícitos, vedado o uso para fins comerciais de revenda sem autorização expressa</li>
            <li>Não reproduzir, distribuir ou comercializar o Conteúdo Gerado sem autorização prévia por escrito</li>
            <li>Não utilizar o Serviço para fins de fraude, estelionato ou qualquer conduta ilícita</li>
            <li>Não solicitar Conteúdo Gerado que contenha discurso de ódio, incitação à violência ou conteúdo ilegal</li>
          </ul>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">6.2 Limitação de responsabilidade do Clama</h3>
          <p className="text-clama-night/80 mb-4">
            Nos termos e limites admitidos pela legislação vigente, a Clama não se responsabiliza:
          </p>
          <p className="text-clama-night/80 mb-4">
            (i) pelas decisões tomadas pelo Usuário com base no Conteúdo Gerado, de qualquer natureza, tendo em vista que a utilização do Serviço é voluntária e que o Usuário age com plena autonomia ao dar uso às informações recebidas, nos termos do art. 14, §3º, inciso II, do Código de Defesa do Consumidor;
          </p>
          <p className="text-clama-night/80 mb-4">
            (ii) por resultados específicos esperados ou não verificados pelo Usuário após o recebimento do Conteúdo Gerado, dado o caráter exclusivamente motivacional e inspiracional do Serviço, que não configura promessa, garantia ou compromisso de qualquer efeito espiritual, emocional, financeiro, relacional ou sobrenatural;
          </p>
          <p className="text-clama-night/80 mb-4">
            (iii) por danos indiretos, mediatos ou emergentes decorrentes do uso do Serviço, ressalvada a responsabilidade por danos diretos comprovadamente causados por falha técnica da Plataforma, na proporção estabelecida pelo art. 944 do Código Civil;
          </p>
          <p className="text-clama-night/80 mb-4">
            (iv) pela indisponibilidade temporária da Plataforma decorrente de caso fortuito, força maior, falhas de infraestrutura de terceiros ou manutenção programada previamente comunicada, nos termos do art. 393 do Código Civil;
          </p>
          <p className="text-clama-night/80 mb-4">
            (v) por ações, omissões ou conteúdos de terceiros referenciados ou acessados por meio da Plataforma, conforme os limites estabelecidos pelo art. 19 da Lei nº 12.965/2014 (Marco Civil da Internet).
          </p>
          <p className="text-clama-night/80 mb-6">
            O Conteúdo Gerado é fornecido no estado em que se encontra, para fins exclusivamente motivacionais e inspiracionais, sem qualquer garantia expressa ou implícita de resultado. Esta cláusula não exclui nem limita a responsabilidade da Clama em casos de dolo ou culpa grave, tampouco em hipóteses de defeito do Serviço que cause dano direto ao Usuário, nos termos do art. 14, caput, do Código de Defesa do Consumidor.
          </p>

          {/* Seção 7 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">7. Propriedade Intelectual</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">7.1 Titularidade</h3>
          <p className="text-clama-night/80 mb-4">
            O Conteúdo Gerado pela Plataforma Clama é produzido por sistema automatizado de inteligência artificial, desenvolvido, parametrizado e operado pela Clama. Na ausência de legislação brasileira específica que atribua titularidade autoral a obras geradas de forma autônoma por sistemas de inteligência artificial — lacuna reconhecida pela doutrina especializada e objeto de debate legislativo no âmbito do PL 2.338/2023 —, a Clama fundamenta seus direitos sobre o Conteúdo Gerado nos seguintes pilares: (i) a titularidade sobre o programa de computador e o sistema de inteligência artificial que produz o conteúdo, protegidos nos termos da Lei nº 9.609/1998; (ii) o investimento criativo, técnico e econômico realizado no desenvolvimento, curadoria editorial e parametrização do sistema; e (iii) a estrutura e a expressão dos Conteúdos Gerados, na medida em que possam ser tuteladas pelo ordenamento jurídico vigente.
          </p>
          <p className="text-clama-night/80 mb-4">
            Com base nos direitos acima descritos, o Conteúdo Gerado é licenciado ao Usuário para uso pessoal, privado e intransferível, sendo vedada a reprodução total ou parcial, a distribuição, a venda, o sublicenciamento ou qualquer forma de exploração comercial sem autorização prévia e por escrito da Clama. A Clama acompanha o desenvolvimento normativo sobre inteligência artificial no Brasil e se compromete a revisar e atualizar esta cláusula em conformidade com a legislação que vier a ser aprovada.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">7.2 Conteúdo do Usuário</h3>
          <p className="text-clama-night/80 mb-6">
            O texto do Pedido e as informações fornecidas pelo Usuário permanecem de titularidade do próprio Usuário. O Clama utiliza tais informações exclusivamente para a geração do Conteúdo Gerado solicitado, sem qualquer outra finalidade, salvo as exceções previstas na Política de Privacidade.
          </p>

          {/* Seção 8 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">8. Privacidade e Proteção de Dados</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">8.1 Base legal e conformidade</h3>
          <p className="text-clama-night/80 mb-4">
            O tratamento de dados pessoais realizado pelo Clama obedece integralmente às disposições da Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018). Os dados coletados (nome, e-mail, celular e conteúdo do pedido) são tratados com base no consentimento expresso do Usuário e na execução do contrato de prestação de serviço.
          </p>
          <p className="text-clama-night/80 mb-4">
            Os dados de idade e sexo, quando fornecidos opcionalmente pelo Usuário, são tratados exclusivamente para fins de personalização do Conteúdo Gerado. O conteúdo do Pedido, por poder revelar informações de natureza emocional, espiritual, religiosa ou relativa à saúde mental, é classificado como dado sensível nos termos do art. 5º, inciso II, da LGPD, sendo seu tratamento condicionado ao consentimento específico e destacado do Usuário, conforme art. 11 da mesma lei.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">8.2 Finalidade do tratamento</h3>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-4">
            <li>Geração e entrega do Conteúdo Gerado solicitado</li>
            <li>Gestão do relacionamento com o Usuário e suporte ao cliente</li>
            <li>Cumprimento de obrigações legais e fiscais</li>
            <li>Melhoria dos serviços da Plataforma, de forma anonimizada e agregada</li>
          </ul>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">8.3 Direitos do titular</h3>
          <p className="text-clama-night/80 mb-6">
            O Usuário, na qualidade de titular de dados pessoais, poderá a qualquer momento: confirmar a existência de tratamento; acessar seus dados; solicitar correção de dados incompletos ou inexatos; solicitar a anonimização, bloqueio ou eliminação de dados desnecessários; solicitar a portabilidade dos dados; e revogar o consentimento, sem prejuízo das obrigações já executadas. Solicitações relacionadas ao tratamento de dados pessoais devem ser enviadas para:{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>. O prazo de resposta é de até 15 (quinze) dias úteis, conforme art. 18 da LGPD.
          </p>

          {/* Seção 9 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">9. Disposições Gerais</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">9.1 Alterações dos Termos</h3>
          <p className="text-clama-night/80 mb-4">
            O Clama reserva-se o direito de alterar os presentes Termos a qualquer tempo, mediante publicação da versão atualizada na Plataforma. O Usuário será notificado de alterações relevantes por e-mail cadastrado. O uso continuado do Serviço após a notificação implica aceite automático dos novos Termos.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">9.2 Vigência e rescisão</h3>
          <p className="text-clama-night/80 mb-4">
            Estes Termos entram em vigor no momento do cadastro e aceite pelo Usuário e permanecem válidos enquanto houver relação de uso entre as partes. O Clama poderá suspender ou encerrar o acesso do Usuário em caso de violação dos presentes Termos, sem necessidade de aviso prévio, sem prejuízo das medidas legais cabíveis.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">9.3 Integridade do contrato</h3>
          <p className="text-clama-night/80 mb-4">
            Caso qualquer disposição destes Termos seja considerada inválida ou inexequível por decisão judicial ou arbitral, as demais disposições permanecerão em pleno vigor e efeito. A invalidade parcial não contamina o restante do instrumento.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">9.4 Foro e legislação aplicável</h3>
          <p className="text-clama-night/80 mb-4">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir eventuais controvérsias decorrentes deste instrumento, as partes elegem o foro da comarca do domicílio do Usuário, nos termos do art. 101, inciso I, do Código de Defesa do Consumidor, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">9.5 Canal de contato e suporte</h3>
          <p className="text-clama-night/80 mb-6">
            Para dúvidas, reclamações, exercício de direitos de titular de dados ou qualquer comunicação relativa a estes Termos, o Usuário pode entrar em contato pelo e-mail:{" "}
            <a href="mailto:contato@clama.me" className="text-clama-accent hover:underline">contato@clama.me</a>. O prazo de resposta é de até 5 dias úteis. O Usuário poderá também registrar reclamações por meio da plataforma oficial Consumidor.gov.br, nos termos da legislação consumerista vigente.
          </p>

          {/* Declaração final */}
          <div className="bg-clama-night/5 border border-clama-border rounded-lg p-4 mb-6">
            <p className="text-clama-night/80 text-sm">
              Ao clicar em "Gerar minha oração" e realizar o pagamento, o Usuário declara expressamente ter lido, compreendido e concordado com todos os termos e condições estabelecidos neste instrumento, reconhecendo que o serviço contratado tem natureza exclusivamente digital, motivacional e inspiracional, sem qualquer vínculo confessional, religioso ou de promessa de resultado sobrenatural.
            </p>
          </div>

          {/* Footer do documento */}
          <div className="mt-12 pt-8 border-t border-clama-border text-center">
            <p className="text-clama-night/60 text-sm mb-2">
              Clama Plataforma de Conteúdo Digital
            </p>
            <p className="text-clama-night/60 text-sm">
              Versão {VERSAO} — Abril de 2026
            </p>
          </div>
        </article>

        <div className="mt-12 pt-8 border-t border-clama-border">
          <Link
            to="/"
            className="text-clama-accent hover:underline text-sm"
          >
            &larr; Voltar para a página inicial
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
