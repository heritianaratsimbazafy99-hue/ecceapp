import { Hero } from "@/components/marketing/hero";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDefaultOrganizationBranding } from "@/lib/organization";
import {
  experienceBlocks,
  productPillars,
  roadmapPhases
} from "@/lib/mock-data";

export default async function HomePage() {
  const branding = await getDefaultOrganizationBranding();

  return (
    <main className="marketing-page">
      <div className="marketing-shell">
        <SiteHeader
          brandMark={branding.brandMark}
          displayName={branding.displayName}
          platformTagline={branding.platformTagline}
        />
        <Hero
          displayName={branding.displayName}
          marketingHeadline={branding.marketingHeadline}
          marketingSubheadline={branding.marketingSubheadline}
          shortName={branding.shortName}
        />

        <section className="section" id="produit">
          <SectionHeading
            eyebrow="Architecture produit"
            title="Une plateforme qui pense parcours, pas simple dépôt de contenus"
            description="Le produit ECCE doit guider le coaché, relier les ressources à l'action et donner aux coachs un véritable cockpit de suivi."
          />

          <div className="card-grid card-grid-three">
            {productPillars.map((pillar) => (
              <article className="feature-card" key={pillar.title}>
                <Badge tone="accent">Pilier</Badge>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="experience">
          <SectionHeading
            eyebrow="Recommandations"
            title="Les blocs d'expérience les plus pertinents pour ECCE"
            description="Ces briques rendent la plateforme plus forte qu'une simple LMS: elles soutiennent vraiment l'accompagnement."
          />

          <div className="card-grid card-grid-two">
            {experienceBlocks.map((block) => (
              <article className="feature-card feature-card-soft" key={block.title}>
                <h3>{block.title}</h3>
                <p>{block.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="roadmap">
          <SectionHeading
            eyebrow="Roadmap"
            title="Un plan réaliste pour construire ECCE sans perdre la vision SaaS"
            description="On commence par un MVP utile dès les premières semaines, puis on renforce l'accompagnement et la communauté."
          />

          <div className="roadmap-grid">
            {roadmapPhases.map((phase) => (
              <article className="roadmap-card" key={phase.title}>
                <div className="roadmap-card-header">
                  <span>{phase.title}</span>
                  <strong>{phase.focus}</strong>
                </div>

                <ul>
                  {phase.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
