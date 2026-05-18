import { Link } from "react-router-dom"
import { StickyNav } from "@/components/clama/StickyNav"
import { Footer } from "@/components/clama/Footer"

const VERSAO = "1.0"
const DATA_VIGENCIA = "abril de 2026"

export default function Privacidade() {
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
              Política de Privacidade e Proteção de Dados
            </h1>
            <p className="text-sm text-clama-text-soft">
              Versão {VERSAO} | Vigência: a partir de {DATA_VIGENCIA}
            </p>
          </div>

          <p className="text-clama-night/80 mb-8">
            Este documento descreve como a plataforma Clama coleta, utiliza, armazena e protege os dados pessoais dos Usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018), a Lei nº 12.965/2014 (Marco Civil da Internet) e demais normas aplicáveis. Sua leitura é recomendada antes de qualquer utilização do Serviço.
          </p>

          {/* Seção 1 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">1. Identificação do Controlador</h2>
          <p className="text-clama-night/80 mb-4">
            O controlador responsável pelo tratamento dos dados pessoais coletados pela plataforma Clama é a pessoa jurídica que a opera, constituída no Brasil nos termos da legislação civil e empresarial vigente, com atividade principal de prestação de serviços digitais de produção e entrega de conteúdo textual motivacional e espiritual.
          </p>
          <p className="text-clama-night/80 mb-4">
            Para fins desta Política, entende-se por controlador a entidade que toma as decisões referentes ao tratamento de dados pessoais, conforme definição do art. 5º, inciso VI, da LGPD.
          </p>
          <p className="text-clama-night/80 mb-6">
            O Usuário poderá entrar em contato com a Clama para quaisquer questões relacionadas à privacidade e ao tratamento de seus dados pessoais pelo endereço de e-mail{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>. Para suporte geral, o canal é{" "}
            <a href="mailto:contato@clama.me" className="text-clama-accent hover:underline">contato@clama.me</a>. A versão atualizada desta Política estará sempre disponível em clama.me/privacidade.
          </p>

          {/* Seção 2 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">2. Dados Pessoais Coletados</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">2.1 Dados fornecidos diretamente pelo Usuário</h3>
          <p className="text-clama-night/80 mb-4">
            Para a prestação do Serviço, o Usuário fornece diretamente à Clama os dados necessários ao seu cadastro e à formulação do Pedido. São dados de fornecimento obrigatório o nome completo, o endereço de e-mail válido e o número de telefone celular ativo, que constituem os meios pelos quais o Conteúdo Gerado é entregue. São dados de fornecimento opcional a idade e o sexo do Usuário, cuja coleta tem finalidade exclusiva de personalização do Conteúdo Gerado, sendo o Usuário inteiramente livre para não os informar sem que isso comprometa o acesso ao Serviço.
          </p>
          <p className="text-clama-night/80 mb-4">
            O conteúdo do Pedido formulado pelo Usuário constitui dado de fornecimento obrigatório para a geração do Conteúdo. Por sua natureza, esse campo pode revelar informações de cunho emocional, espiritual, religioso ou relativo à saúde mental do Usuário, razão pela qual é classificado como dado sensível nos termos do art. 5º, inciso II, da LGPD, estando sujeito ao regime de proteção diferenciado previsto no art. 11 da mesma lei, conforme detalhado na Seção 3 desta Política.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">2.2 Dados coletados automaticamente</h3>
          <p className="text-clama-night/80 mb-4">
            No momento do acesso à Plataforma, podem ser coletados automaticamente dados técnicos de navegação, como endereço IP, tipo e versão do navegador, sistema operacional, páginas acessadas e data e hora do acesso. Esses dados são utilizados exclusivamente para fins de segurança, diagnóstico técnico e melhoria da Plataforma, sempre de forma anonimizada e agregada, sem permitir a identificação individual do Usuário. Sua coleta decorre da obrigação legal prevista no art. 13 da Lei nº 12.965/2014 (Marco Civil da Internet) e é realizada com base no legítimo interesse da Clama na manutenção da segurança e integridade da Plataforma.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">2.3 Dados de pagamento</h3>
          <p className="text-clama-night/80 mb-6">
            Os dados de pagamento, como número de cartão de crédito ou débito e informações bancárias, são processados diretamente pela plataforma Asaas, empresa brasileira de serviços financeiros regulamentada pelo Banco Central do Brasil. A Clama não armazena dados completos de instrumentos de pagamento em seus próprios servidores. Os registros mantidos pela Clama limitam-se à confirmação da transação, ao valor pago e à data de sua realização, para fins exclusivos de controle fiscal e suporte ao Usuário.
          </p>

          {/* Seção 3 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">3. Tratamento de Dados Sensíveis</h2>
          <p className="text-clama-night/80 mb-4">
            O conteúdo do Pedido formulado pelo Usuário pode revelar, por sua própria natureza, informações relativas à saúde mental, à vida emocional, às crenças religiosas ou à situação espiritual do Usuário. Nos termos do art. 5º, inciso II, da LGPD, tais informações enquadram-se na categoria de dados sensíveis, cujo tratamento exige base legal específica e condições mais rigorosas do que as aplicáveis aos dados pessoais comuns.
          </p>
          <p className="text-clama-night/80 mb-4">
            O tratamento desses dados pela Clama fundamenta-se no consentimento específico e destacado do Usuário, prestado de forma expressa e separada do aceite geral dos Termos de Uso, por meio de campo próprio no formulário de cadastro, conforme exigência do art. 11, inciso I, da LGPD. Esse consentimento específico é condição para o uso do Serviço, uma vez que o conteúdo do Pedido é indispensável à geração do Conteúdo personalizado.
          </p>
          <p className="text-clama-night/80 mb-6">
            Os dados sensíveis contidos no Pedido são utilizados exclusivamente para a geração e entrega do Conteúdo Gerado solicitado, sendo vedado qualquer uso secundário, compartilhamento ou tratamento para finalidade diversa sem nova e expressa manifestação de consentimento pelo Usuário. Após o cumprimento da finalidade para a qual foram coletados, esses dados são anonimizados ou eliminados, salvo obrigação legal de conservação, conforme descrito na Seção 7 desta Política.
          </p>

          {/* Seção 4 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">4. Finalidades do Tratamento</h2>
          <p className="text-clama-night/80 mb-4">
            Os dados pessoais coletados pela Clama são tratados para finalidades determinadas, legítimas e explicitamente informadas ao Usuário no momento da coleta, em observância ao princípio da finalidade previsto no art. 6º, inciso I, da LGPD.
          </p>
          <p className="text-clama-night/80 mb-4">
            A finalidade principal do tratamento é a execução do Serviço contratado, consistente na geração e entrega do Conteúdo Gerado personalizado com base nas informações fornecidas pelo Usuário no Pedido. Para essa finalidade, são utilizados o nome completo, o e-mail, o número de celular e o conteúdo do Pedido, com base legal na execução do contrato, nos termos do art. 7º, inciso V, da LGPD.
          </p>
          <p className="text-clama-night/80 mb-4">
            Os dados de cadastro são também utilizados para a gestão do relacionamento com o Usuário, incluindo o atendimento a dúvidas, reclamações e solicitações de exercício de direitos do titular, com fundamento no legítimo interesse da Clama na manutenção de relação transparente e responsável com seus usuários, nos termos do art. 7º, inciso IX, da LGPD.
          </p>
          <p className="text-clama-night/80 mb-4">
            Os registros de transação são mantidos para o cumprimento de obrigações legais e fiscais impostas à Clama pela legislação tributária brasileira, com base no art. 7º, inciso II, da LGPD. Os dados de navegação coletados automaticamente são utilizados para fins de segurança, prevenção a fraudes e melhoria da Plataforma, de forma anonimizada, com base no legítimo interesse e na obrigação legal decorrente do art. 13 do Marco Civil da Internet.
          </p>
          <p className="text-clama-night/80 mb-6">
            A Clama não utiliza os dados pessoais dos Usuários para fins publicitários, de marketing direto, segmentação comportamental ou compartilhamento com anunciantes. Qualquer nova finalidade de tratamento não prevista nesta Política será comunicada ao Usuário previamente, com solicitação de novo consentimento nos casos em que a lei assim exigir.
          </p>

          {/* Seção 5 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">5. Bases Legais para o Tratamento</h2>
          <p className="text-clama-night/80 mb-4">
            Todo tratamento de dados pessoais realizado pela Clama está amparado em ao menos uma das bases legais taxativamente previstas na LGPD. A transparência sobre essas bases é parte do compromisso da Clama com o tratamento responsável e lícito dos dados de seus Usuários.
          </p>
          <p className="text-clama-night/80 mb-4">
            O <strong>consentimento</strong>, previsto no art. 7º, inciso I, da LGPD, é a base legal utilizada para o tratamento dos dados opcionais de idade e sexo, bem como, de forma específica e destacada, para o tratamento dos dados sensíveis contidos no conteúdo do Pedido, conforme exigência do art. 11, inciso I, da mesma lei. O Usuário pode revogar o consentimento a qualquer tempo, por procedimento simples e gratuito, sem prejuízo da licitude dos tratamentos realizados anteriormente à revogação. Caso o Usuário não deseje que seus dados permaneçam armazenados nos sistemas da Clama, deverá entrar em contato com o suporte pelo e-mail{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>{" "}
            para solicitar a remoção de seus dados, que será processada nos termos do art. 18 da LGPD e dos prazos de retenção obrigatória previstos nesta Política. A revogação do consentimento para dados essenciais à execução do Serviço implicará a impossibilidade de sua prestação.
          </p>
          <p className="text-clama-night/80 mb-4">
            A <strong>execução do contrato</strong>, prevista no art. 7º, inciso V, da LGPD, fundamenta o tratamento dos dados necessários à prestação do Serviço contratado, como nome, e-mail, celular e conteúdo do Pedido. Sem esses dados, a Clama não tem condições técnicas de gerar e entregar o Conteúdo solicitado.
          </p>
          <p className="text-clama-night/80 mb-4">
            O <strong>cumprimento de obrigação legal</strong>, previsto no art. 7º, inciso II, da LGPD, ampara a manutenção de registros fiscais, contábeis e de logs de acesso, exigidos pela legislação tributária brasileira e pelo art. 13 do Marco Civil da Internet, independentemente do consentimento do Usuário.
          </p>
          <p className="text-clama-night/80 mb-6">
            O <strong>legítimo interesse</strong>, previsto no art. 7º, inciso IX, da LGPD, sustenta atividades de suporte ao Usuário, melhoria da Plataforma e segurança da informação, sempre limitadas ao mínimo necessário e em respeito aos direitos e expectativas dos titulares.
          </p>

          {/* Seção 6 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">6. Compartilhamento de Dados</h2>
          <p className="text-clama-night/80 mb-4">
            A Clama não vende, cede, aluga ou compartilha dados pessoais dos Usuários com terceiros para fins comerciais, publicitários ou de qualquer outra natureza não prevista nesta Política. O compartilhamento de dados ocorre exclusivamente nas hipóteses abaixo descritas, todas amparadas pela legislação vigente.
          </p>
          <p className="text-clama-night/80 mb-4">
            Os dados de transação são compartilhados com a <strong>Asaas</strong>, empresa brasileira de serviços financeiros com sede em Joinville/SC, regulamentada pelo Banco Central do Brasil, que atua como operadora de dados nos termos do art. 5º, inciso VII, da LGPD. Por ser uma empresa nacional, o tratamento dos dados de pagamento pela Asaas está integralmente sujeito às disposições da LGPD e da regulamentação do Banco Central, sem necessidade de transferência internacional de dados. Essa relação é regida por contrato específico de processamento de dados que impõe à Asaas obrigações equivalentes às previstas nesta Política. A Clama não tem acesso nem armazena os dados completos de cartão de crédito ou débito processados pela Asaas.
          </p>
          <p className="text-clama-night/80 mb-4">
            Dados pessoais poderão ser compartilhados com autoridades públicas, órgãos regulatórios, o Ministério Público ou o Poder Judiciário quando exigido por lei, ordem judicial ou determinação de autoridade competente, nos termos do art. 7º, incisos II e VI, da LGPD. Nessas hipóteses, a Clama compartilhará apenas os dados estritamente necessários ao atendimento da solicitação legal.
          </p>
          <p className="text-clama-night/80 mb-6">
            Dados poderão ainda ser utilizados para o exercício regular de direitos da Clama em processos judiciais, administrativos ou arbitrais, conforme art. 7º, inciso VI, da LGPD. Quando houver necessidade de envolver outros operadores ou prestadores de serviço no tratamento de dados, a Clama formalizará essa relação por meio de contratos que imponham nível de proteção equivalente ao desta Política, conforme exigência do art. 37 da LGPD.
          </p>

          {/* Seção 7 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">7. Retenção e Exclusão dos Dados</h2>
          <p className="text-clama-night/80 mb-4">
            Os dados pessoais coletados pela Clama são conservados pelo período mínimo necessário ao cumprimento das finalidades para as quais foram coletados, observadas as obrigações legais de retenção aplicáveis.
          </p>
          <p className="text-clama-night/80 mb-4">
            Os dados de cadastro e o conteúdo do Pedido são mantidos pelo período de vigência da relação de uso entre as partes, acrescido de cinco anos para fins de atendimento ao prazo prescricional previsto no art. 206, §3º, do Código Civil, e para eventual defesa em processos administrativos ou judiciais. Os registros de pagamento são mantidos por cinco anos, conforme exigência da legislação fiscal e tributária brasileira, em especial o art. 195 do Código Tributário Nacional. Os logs de acesso à internet são conservados pelo prazo de seis meses, nos termos do art. 13 da Lei nº 12.965/2014 (Marco Civil da Internet).
          </p>
          <p className="text-clama-night/80 mb-4">
            Os dados sensíveis contidos no conteúdo do Pedido são conservados pelo prazo estritamente necessário à geração e entrega do Conteúdo Gerado solicitado. Após o cumprimento dessa finalidade, são anonimizados ou eliminados de forma segura, salvo obrigação legal de conservação por prazo diverso. Os dados anonimizados, por não permitirem a identificação individual do Usuário, podem ser mantidos por prazo indeterminado para fins estatísticos e de melhoria da Plataforma.
          </p>
          <p className="text-clama-night/80 mb-6">
            Findo o prazo de retenção aplicável a cada categoria de dado, a Clama procederá à sua eliminação por meios seguros ou à sua anonimização definitiva, conforme art. 16 da LGPD, exceto quando a conservação for exigida por obrigação legal, regulatória ou para o exercício regular de direitos.
          </p>

          {/* Seção 8 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">8. Segurança dos Dados</h2>
          <p className="text-clama-night/80 mb-4">
            A Clama adota medidas técnicas e organizacionais adequadas e proporcionais à natureza dos dados tratados e aos riscos envolvidos, com o objetivo de proteger os dados pessoais dos Usuários contra acesso não autorizado, perda acidental, destruição, alteração, comunicação indevida ou qualquer outra forma de tratamento inadequado ou ilícito, nos termos do art. 46 da LGPD.
          </p>
          <p className="text-clama-night/80 mb-4">
            Entre as medidas técnicas adotadas, destacam-se a transmissão de dados por protocolo HTTPS com criptografia TLS, o controle de acesso restrito aos dados pessoais dos Usuários limitado aos colaboradores e sistemas com necessidade operacional justificada, o monitoramento de acessos e registros de segurança para detecção de atividades suspeitas, e o uso de plataforma de pagamento regulamentada pelo Banco Central do Brasil (Asaas), sem armazenamento de dados de cartão nos servidores da Clama. Do ponto de vista organizacional, a Clama realiza revisões periódicas de suas políticas e práticas de segurança da informação.
          </p>
          <p className="text-clama-night/80 mb-6">
            Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos Usuários, a Clama comunicará o ocorrido à Autoridade Nacional de Proteção de Dados (ANPD) e aos titulares afetados em prazo razoável e compatível com a gravidade do incidente, conforme exigência do art. 48 da LGPD. A comunicação conterá, no mínimo, a descrição da natureza dos dados afetados, dos riscos envolvidos, das medidas adotadas para conter o incidente e das orientações aos titulares para mitigar eventuais danos.
          </p>

          {/* Seção 9 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">9. Direitos do Titular dos Dados</h2>
          <p className="text-clama-night/80 mb-4">
            A LGPD assegura ao Usuário, na qualidade de titular de dados pessoais, um conjunto de direitos exercíveis a qualquer tempo, de forma gratuita e sem necessidade de justificativa, nos termos do art. 18 da lei.
          </p>
          <p className="text-clama-night/80 mb-4">
            O Usuário tem direito à confirmação da existência de tratamento e ao acesso aos dados pessoais que a Clama possui sobre si, podendo solicitar cópia completa dos dados tratados. Tem direito à correção de dados incompletos, inexatos ou desatualizados, bem como à anonimização, ao bloqueio ou à eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.
          </p>
          <p className="text-clama-night/80 mb-4">
            O Usuário tem direito à portabilidade dos seus dados a outro fornecedor de serviço, observados os segredos comerciais e industriais da Clama e a regulamentação da ANPD. Tem também direito à eliminação dos dados tratados com base em seu consentimento, exceto nas hipóteses de conservação obrigatória previstas no art. 16 da LGPD, como o cumprimento de obrigação legal ou o exercício regular de direitos.
          </p>
          <p className="text-clama-night/80 mb-4">
            O Usuário tem direito a obter informações sobre as entidades públicas e privadas com as quais a Clama compartilhou seus dados, bem como sobre a possibilidade de não fornecer o consentimento e as consequências dessa negativa. Tem ainda o direito de revogar o consentimento prestado a qualquer momento, por procedimento gratuito e facilitado, sem prejuízo da licitude do tratamento realizado anteriormente. Por fim, tem direito à revisão de decisões tomadas unicamente com base em tratamento automatizado de dados pessoais que afetem seus interesses, nos termos do art. 20 da LGPD.
          </p>
          <p className="text-clama-night/80 mb-6">
            Para exercer qualquer dos direitos acima, o Usuário deve enviar solicitação ao e-mail{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>, identificando-se adequadamente e descrevendo o direito que deseja exercer. O prazo de resposta é de até quinze dias úteis, conforme art. 18, §3º, da LGPD. O Usuário poderá, ainda, apresentar reclamação diretamente à Autoridade Nacional de Proteção de Dados (ANPD), por meio dos canais oficiais disponíveis em gov.br/anpd, nos termos do art. 18, §1º, da LGPD.
          </p>

          {/* Seção 10 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">10. Cookies e Tecnologias de Rastreamento</h2>
          <p className="text-clama-night/80 mb-4">
            A Clama pode utilizar cookies e tecnologias similares para garantir o funcionamento adequado da Plataforma e coletar dados de navegação de forma anonimizada. Os cookies utilizados são de dois tipos: essenciais e analíticos.
          </p>
          <p className="text-clama-night/80 mb-4">
            Os <strong>cookies essenciais</strong> são necessários para o funcionamento básico da Plataforma, abrangendo funcionalidades como autenticação, segurança e manutenção de sessão do Usuário. Sua desativação compromete o funcionamento do Serviço, razão pela qual não estão sujeitos à opção de recusa. Os <strong>cookies analíticos</strong> são utilizados exclusivamente para análise de desempenho e melhoria da experiência na Plataforma, de forma anonimizada, sem identificação individual do Usuário.
          </p>
          <p className="text-clama-night/80 mb-6">
            A Clama não utiliza cookies de rastreamento para fins publicitários, de remarketing ou de elaboração de perfis comportamentais. O Usuário pode configurar seu navegador para bloquear ou excluir cookies, sendo que tal ação poderá afetar a disponibilidade de algumas funcionalidades da Plataforma.
          </p>

          {/* Seção 11 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">11. Transferência Internacional de Dados</h2>
          <p className="text-clama-night/80 mb-4">
            O processamento de pagamentos é realizado pela Asaas, empresa brasileira de serviços financeiros com sede em Joinville/SC, regulamentada pelo Banco Central do Brasil. Por ser uma empresa nacional, o tratamento dos dados de pagamento ocorre integralmente em território brasileiro, estando plenamente sujeito às disposições da LGPD, sem necessidade de transferência internacional de dados para essa finalidade.
          </p>
          <p className="text-clama-night/80 mb-6">
            Eventuais outros serviços de infraestrutura utilizados pela Clama, como plataformas de armazenamento em nuvem, podem também envolver o processamento de dados em território estrangeiro. Em todos os casos, a Clama exige contratualmente que os operadores internacionais adotem padrões de proteção de dados compatíveis com os requisitos da LGPD, assegurando aos titulares nível de proteção equivalente ao garantido no Brasil.
          </p>

          {/* Seção 12 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">12. Menores de Idade</h2>
          <p className="text-clama-night/80 mb-4">
            O Serviço da Clama é destinado exclusivamente a pessoas físicas com capacidade civil plena, sendo vedado o cadastro e o uso por menores de dezoito anos não emancipados. A Clama não coleta intencionalmente dados pessoais de menores de idade e não possui mecanismo de verificação de idade que garanta com absoluta certeza o cumprimento dessa restrição, razão pela qual a veracidade da informação de maioridade declarada é de responsabilidade do próprio Usuário.
          </p>
          <p className="text-clama-night/80 mb-6">
            Caso a Clama tome conhecimento de que dados pessoais de menores foram coletados sem o consentimento de seus responsáveis legais, tais dados serão imediatamente eliminados de seus sistemas, nos termos do art. 14 da LGPD, que dispõe sobre o tratamento de dados pessoais de crianças e adolescentes. Responsáveis legais que identifiquem situação dessa natureza poderão comunicá-la pelo e-mail{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>.
          </p>

          {/* Seção 13 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">13. Alterações desta Política</h2>
          <p className="text-clama-night/80 mb-4">
            A Clama reserva-se o direito de atualizar esta Política de Privacidade a qualquer tempo, para refletir alterações na legislação aplicável, nas práticas de tratamento de dados ou nas funcionalidades da Plataforma. Alterações relevantes serão comunicadas ao Usuário por e-mail cadastrado com antecedência mínima de dez dias corridos antes de sua entrada em vigor, de forma que o Usuário tenha ciência prévia das mudanças e possa exercer seus direitos, caso discorde das novas condições.
          </p>
          <p className="text-clama-night/80 mb-6">
            O uso continuado da Plataforma após o prazo de comunicação implica aceite das novas condições. Caso o Usuário não concorde com as alterações promovidas, poderá solicitar a eliminação de seus dados e cessar o uso do Serviço, sem qualquer ônus. A versão vigente desta Política estará sempre disponível em clama.me/privacidade, com indicação da data de última atualização e do número de versão.
          </p>

          {/* Seção 13B — Dados do Blog (Story 6.2) */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">13.B Dados do Blog</h2>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">13.B.1 Comentários</h3>
          <p className="text-clama-night/80 mb-4">
            Ao comentar em um post do blog, o Clama armazena: (i) o conteúdo textual do comentário; (ii) o nome de exibição que o Usuário escolheu (nome completo ou primeiro nome + inicial do sobrenome — configurável em <Link to="/conta" className="text-clama-accent hover:underline">/conta</Link>); (iii) o endereço IP de origem, em formato criptografado; e (iv) a data e hora de publicação.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">13.B.2 Retenção do IP — 6 meses</h3>
          <p className="text-clama-night/80 mb-4">
            O endereço IP é mantido pelo prazo de 6 (seis) meses contados da publicação do comentário, conforme exigência mínima do art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet). Após esse prazo, o IP é purgado automaticamente do banco de dados. O comentário e o nome de exibição permanecem visíveis até que o Usuário ou o Clama os removam.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">13.B.3 Likes (curtidas)</h3>
          <p className="text-clama-night/80 mb-4">
            Quando o Usuário curte um post, o Clama armazena apenas a associação entre o identificador interno do Usuário (UUID) e o post. O endereço IP não é registrado em likes.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">13.B.4 Direito ao esquecimento — exclusão de comentários</h3>
          <p className="text-clama-night/80 mb-4">
            O Usuário pode excluir os próprios comentários a qualquer momento, pela interface do blog. Para solicitar a exclusão definitiva de dados pessoais associados aos comentários (incluindo IPs ainda dentro do prazo de retenção), envie um e-mail para{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>{" "}
            informando o e-mail cadastrado e o assunto "exclusão LGPD blog". O atendimento acontece em até 30 (trinta) dias, conforme o art. 18, § 3º da LGPD.
          </p>

          <h3 className="font-serif text-clama-night text-lg mt-6 mb-3">13.B.5 Banimento (moderação)</h3>
          <p className="text-clama-night/80 mb-6">
            Em caso de violação dos Termos de Uso, o Clama pode suspender o acesso do Usuário ao sistema de comentários e likes, sem aviso prévio. O banimento é registrado internamente com motivo e identificação do administrador responsável. O Usuário banido continua podendo ler o blog e usar os demais serviços do Clama. Para questionar um banimento, envie e-mail para{" "}
            <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>.
          </p>

          {/* Seção 14 */}
          <h2 className="font-serif text-clama-night text-xl mt-10 mb-4">14. Legislação Aplicável e Foro</h2>
          <p className="text-clama-night/80 mb-4">
            Esta Política de Privacidade é regida pelas leis da República Federativa do Brasil, em especial pela Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais), pela Lei nº 12.965/2014 (Marco Civil da Internet), pelo Decreto nº 8.771/2016 e pela Lei nº 8.078/1990 (Código de Defesa do Consumidor).
          </p>
          <p className="text-clama-night/80 mb-6">
            Para dirimir eventuais controvérsias decorrentes desta Política que não puderem ser resolvidas diretamente com a Clama, fica eleito o foro da comarca do domicílio do Usuário, nos termos do art. 101, inciso I, do Código de Defesa do Consumidor, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.
          </p>

          {/* Footer do documento */}
          <div className="mt-12 pt-8 border-t border-clama-border text-center">
            <p className="text-clama-night/60 text-sm mb-2">
              Clama Plataforma de Conteúdo Digital
            </p>
            <p className="text-clama-night/60 text-sm mb-2">
              Política de Privacidade e Proteção de Dados — Versão {VERSAO} — Abril de 2026
            </p>
            <p className="text-clama-night/60 text-sm">
              <a href="mailto:privacidade@clama.me" className="text-clama-accent hover:underline">privacidade@clama.me</a>{" "}
              | clama.me/privacidade
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
