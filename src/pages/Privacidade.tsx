import { Link } from "react-router-dom"

const VERSAO = "1"
const DATA_ATUALIZACAO = "10 de abril de 2026"

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-clama-cream">
      {/* Header */}
      <header className="bg-clama-night py-6 px-4">
        <div className="max-w-prose mx-auto">
          <Link to="/" className="font-serif text-2xl text-clama-gold hover:text-clama-gold-hover">
            Clama
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-prose mx-auto px-4 py-12">
        <article className="prose prose-lg">
          <p className="text-sm text-clama-text-soft mb-8">
            Ultima atualizacao: {DATA_ATUALIZACAO}. Versao {VERSAO}.
          </p>

          <h1 className="font-serif text-clama-night text-3xl mb-8">Politica de Privacidade</h1>

          <p className="text-clama-night/80 mb-6">
            O Clama tem compromisso com a protecao dos seus dados pessoais. Esta Politica de
            Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informacoes
            em conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei n 13.709/2018).
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">1. Dados que coletamos</h2>
          <p className="text-clama-night/80 mb-4">Ao utilizar o Clama, coletamos:</p>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-6">
            <li><strong>Dados de identificacao:</strong> nome, e-mail, telefone (opcional), idade (opcional), sexo (opcional)</li>
            <li><strong>Conteudo do pedido:</strong> texto do seu pedido de oracao</li>
            <li><strong>Dados de pagamento:</strong> processados pelo Asaas (nao armazenamos dados de cartao)</li>
            <li><strong>Dados tecnicos:</strong> endereco IP, data e hora de acesso</li>
            <li><strong>Preferencia de canal:</strong> e-mail ou WhatsApp para recebimento da oracao</li>
          </ul>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">2. Como usamos seus dados</h2>
          <p className="text-clama-night/80 mb-4">Utilizamos seus dados para:</p>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-6">
            <li>Gerar uma oracao personalizada utilizando inteligencia artificial (Claude, da Anthropic)</li>
            <li>Enviar a oracao gerada pelo canal escolhido (e-mail ou WhatsApp)</li>
            <li>Processar seu pagamento atraves do Asaas</li>
            <li>Entrar em contato sobre seu pedido, se necessario</li>
            <li>Melhorar nossos servicos e experiencia do usuario</li>
          </ul>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">3. Base legal para tratamento</h2>
          <p className="text-clama-night/80 mb-6">
            O tratamento dos seus dados e realizado com base no seu <strong>consentimento explicito</strong>,
            fornecido ao marcar a caixa de aceite no formulario de pedido, conforme Art. 7, I da LGPD.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">4. Compartilhamento de dados</h2>
          <p className="text-clama-night/80 mb-4">Compartilhamos seus dados apenas com:</p>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-6">
            <li><strong>Anthropic (Claude API):</strong> para geracao da oracao (nome, sexo e conteudo do pedido)</li>
            <li><strong>Asaas:</strong> para processamento de pagamentos</li>
            <li><strong>Resend:</strong> para envio de e-mails</li>
            <li><strong>Z-API:</strong> para envio via WhatsApp (quando selecionado)</li>
          </ul>
          <p className="text-clama-night/80 mb-6">
            Nao vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de marketing.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">5. Seguranca dos dados</h2>
          <p className="text-clama-night/80 mb-6">
            Seus dados pessoais sao armazenados com criptografia em repouso. Utilizamos HTTPS em
            todas as comunicacoes e seguimos as melhores praticas de seguranca da informacao.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">6. Retencao de dados</h2>
          <p className="text-clama-night/80 mb-6">
            Seus dados sao mantidos pelo tempo necessario para cumprir as finalidades descritas
            nesta politica, ou conforme exigido por lei. Apos esse periodo, os dados sao excluidos
            de forma segura.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">7. Seus direitos (LGPD)</h2>
          <p className="text-clama-night/80 mb-4">Voce tem direito a:</p>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-6">
            <li><strong>Acesso:</strong> solicitar uma copia dos seus dados pessoais</li>
            <li><strong>Correcao:</strong> corrigir dados incompletos ou inexatos</li>
            <li><strong>Exclusao:</strong> solicitar a eliminacao dos seus dados</li>
            <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
            <li><strong>Revogacao do consentimento:</strong> retirar seu consentimento a qualquer momento</li>
          </ul>
          <p className="text-clama-night/80 mb-6">
            Para exercer qualquer desses direitos, envie um e-mail para{" "}
            <a href="mailto:privacidade@clama.com.br" className="text-clama-accent hover:underline">
              privacidade@clama.com.br
            </a>{" "}
            informando seu nome e o e-mail utilizado no pedido. Respondemos em ate 15 dias uteis.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">8. Uso de inteligencia artificial</h2>
          <p className="text-clama-night/80 mb-6">
            As oracoes sao geradas por inteligencia artificial (Claude, da Anthropic) com supervisao
            pastoral do prompt. Cada oracao e unica, mas nao substitui um momento humano com um
            lider espiritual de confianca.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">9. Alteracoes nesta politica</h2>
          <p className="text-clama-night/80 mb-6">
            Esta politica pode ser atualizada periodicamente. Notificaremos sobre mudanças
            significativas atraves do nosso site. Recomendamos revisar esta pagina regularmente.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">10. Contato</h2>
          <p className="text-clama-night/80 mb-6">
            Para duvidas sobre esta politica ou sobre o tratamento dos seus dados, entre em contato:
          </p>
          <p className="text-clama-night/80 mb-2">
            <strong>E-mail:</strong>{" "}
            <a href="mailto:privacidade@clama.com.br" className="text-clama-accent hover:underline">
              privacidade@clama.com.br
            </a>
          </p>
          <p className="text-clama-night/80">
            <strong>E-mail geral:</strong>{" "}
            <a href="mailto:contato@clama.com.br" className="text-clama-accent hover:underline">
              contato@clama.com.br
            </a>
          </p>
        </article>

        <div className="mt-12 pt-8 border-t border-clama-border">
          <Link
            to="/"
            className="text-clama-accent hover:underline text-sm"
          >
            &larr; Voltar para a pagina inicial
          </Link>
        </div>
      </main>
    </div>
  )
}
