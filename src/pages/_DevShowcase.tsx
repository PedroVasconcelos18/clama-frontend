import Divider from "@/components/utility/Divider"
import SectionLabel from "@/components/utility/SectionLabel"
import LoadingSpinner from "@/components/utility/LoadingSpinner"
import PastoralAlert from "@/components/utility/PastoralAlert"

export default function DevShowcase() {
  return (
    <div className="min-h-screen bg-clama-night p-8">
      <h1 className="text-3xl font-serif text-clama-gold mb-8">
        Dev Showcase - Utility Components
      </h1>

      <section className="mb-12">
        <h2 className="text-xl font-serif text-clama-cream mb-4">
          SectionLabel
        </h2>
        <SectionLabel>Nossa Missão</SectionLabel>
      </section>

      <Divider className="my-8" />

      <section className="mb-12">
        <h2 className="text-xl font-serif text-clama-cream mb-4">Divider</h2>
        <p className="text-clama-cream/60 mb-4">
          Linha dourada sutil (acima e abaixo)
        </p>
        <Divider />
      </section>

      <Divider className="my-8" />

      <section className="mb-12">
        <h2 className="text-xl font-serif text-clama-cream mb-4">
          LoadingSpinner
        </h2>
        <div className="flex gap-8 items-center">
          <LoadingSpinner size={24} />
          <LoadingSpinner size={32} />
          <LoadingSpinner size={48} />
        </div>
      </section>

      <Divider className="my-8" />

      <section className="mb-12">
        <h2 className="text-xl font-serif text-clama-cream mb-4">
          PastoralAlert
        </h2>
        <div className="space-y-4 max-w-xl">
          <PastoralAlert variant="info">
            Sua oração está sendo preparada com todo carinho.
          </PastoralAlert>
          <PastoralAlert variant="success">
            Pagamento confirmado! Em breve você receberá sua oração.
          </PastoralAlert>
          <PastoralAlert variant="error">
            Algo não saiu como esperado. Tente novamente em instantes.
          </PastoralAlert>
        </div>
      </section>
    </div>
  )
}
