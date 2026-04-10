import { Link } from "react-router-dom"

const VERSAO = "1"
const DATA_ATUALIZACAO = "10 de abril de 2026"

export default function Termos() {
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

          <h1 className="font-serif text-clama-night text-3xl mb-8">Termos de Uso</h1>

          <p className="text-clama-night/80 mb-6">
            Bem-vindo ao Clama. Ao utilizar nossos servicos, voce concorda com estes Termos de Uso.
            Leia-os atentamente.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">1. Descricao do servico</h2>
          <p className="text-clama-night/80 mb-6">
            O Clama e um servico de geracao de oracoes escritas personalizadas utilizando
            inteligencia artificial, com curadoria pastoral. Ao fazer um pedido, voce recebe
            uma oracao unica baseada nas informacoes fornecidas.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">2. Uso de inteligencia artificial</h2>
          <p className="text-clama-night/80 mb-6">
            As oracoes sao geradas por inteligencia artificial (Claude, da Anthropic) com supervisao
            pastoral do prompt. Cada oracao e unica e criada especificamente para voce. O conteudo
            e baseado em tradicoes cristaas e busca oferecer conforto e esperanca.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">3. Limitacoes importantes</h2>
          <div className="bg-clama-cream-warm border border-clama-border rounded-lg p-4 mb-6">
            <p className="text-clama-night/80 mb-4">
              <strong>O Clama NAO:</strong>
            </p>
            <ul className="list-disc pl-6 text-clama-night/80 space-y-2">
              <li>Promete milagres ou resultados especificos</li>
              <li>Substitui aconselhamento espiritual presencial com um lider de confianca</li>
              <li>Oferece servico medico, psicologico, juridico ou financeiro</li>
              <li>Garante a realizacao de pedidos especificos</li>
              <li>Representa uma igreja ou denominacao especifica</li>
            </ul>
          </div>
          <p className="text-clama-night/80 mb-6">
            As oracoes sao oferecidas como apoio espiritual complementar e nao devem ser
            consideradas como unica fonte de orientacao espiritual.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">4. Pagamento e contribuicao</h2>
          <p className="text-clama-night/80 mb-6">
            O valor pago e uma contribuicao que viabiliza a manutencao do servico. O pagamento
            e processado de forma segura pelo Asaas, utilizando Pix, boleto ou cartao de credito.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">5. Politica de reembolso</h2>
          <p className="text-clama-night/80 mb-6">
            Caso nao esteja satisfeito com o servico, voce pode solicitar reembolso integral
            em ate 7 dias apos o pagamento. Para isso, envie um e-mail para{" "}
            <a href="mailto:contato@clama.com.br" className="text-clama-accent hover:underline">
              contato@clama.com.br
            </a>{" "}
            informando o motivo da solicitacao.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">6. Propriedade intelectual</h2>
          <p className="text-clama-night/80 mb-6">
            A oracao gerada para voce e de sua propriedade. Voce pode compartilha-la, imprimi-la
            ou usa-la como desejar. A marca, logo e design do Clama permanecem de propriedade
            exclusiva do servico.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">7. Responsabilidades do usuario</h2>
          <p className="text-clama-night/80 mb-4">Ao usar o Clama, voce se compromete a:</p>
          <ul className="list-disc pl-6 text-clama-night/80 space-y-2 mb-6">
            <li>Fornecer informacoes verdadeiras</li>
            <li>Nao utilizar o servico para fins ilegais ou prejudiciais</li>
            <li>Nao tentar manipular ou explorar o sistema</li>
            <li>Respeitar os direitos de terceiros</li>
          </ul>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">8. Disponibilidade do servico</h2>
          <p className="text-clama-night/80 mb-6">
            O Clama busca manter o servico disponivel 24 horas por dia, 7 dias por semana.
            No entanto, podem ocorrer interrupcoes para manutencao ou por motivos tecnicos
            fora do nosso controle.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">9. Alteracoes nos termos</h2>
          <p className="text-clama-night/80 mb-6">
            Estes termos podem ser atualizados periodicamente. Mudancas significativas serao
            comunicadas pelo site. O uso continuado do servico apos alteracoes implica aceite
            dos novos termos.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">10. Legislacao aplicavel</h2>
          <p className="text-clama-night/80 mb-6">
            Estes Termos de Uso sao regidos pelas leis brasileiras. Eventuais disputas serao
            resolvidas no foro da comarca de Sao Paulo/SP.
          </p>

          <h2 className="font-serif text-clama-night text-xl mt-8 mb-4">11. Contato</h2>
          <p className="text-clama-night/80 mb-6">
            Para duvidas sobre estes termos, entre em contato:
          </p>
          <p className="text-clama-night/80">
            <strong>E-mail:</strong>{" "}
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
