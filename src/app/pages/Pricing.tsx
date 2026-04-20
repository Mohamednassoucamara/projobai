import { Link } from "react-router";
import { Check, ArrowLeft, Sparkles, Zap, Shield, Clock, Target, Users, TrendingUp, Award, Rocket } from "lucide-react";
import { motion } from "motion/react";
import logoImage from "../../assets/logo.png";
import Footer from "../components/Footer";

export default function Pricing() {
  const benefits = [
    {
      icon: Zap,
      title: "Résultats rapides",
      description: "Optimisez votre profil et trouvez un emploi plus rapidement",
    },
    {
      icon: Shield,
      title: "Sécurisé & confidentiel",
      description: "Vos données sont protégées et restent confidentielles",
    },
    {
      icon: Target,
      title: "Ciblage précis",
      description: "Des recommandations personnalisées selon votre profil",
    },
    {
      icon: Award,
      title: "Expertise IA",
      description: "Propulsé par l'intelligence artificielle de pointe",
    },
  ];

  const plans = [
    {
      name: "Gratuit",
      price: "0",
      description: "Parfait pour commencer votre recherche d'emploi",
      features: [
        "Création de CV basique",
        "Accès aux offres d'emploi",
        "3 candidatures par mois",
        "Support par email",
      ],
      buttonText: "Commencer gratuitement",
      buttonVariant: "outline",
      popular: false,
      gradient: "from-slate-500 to-slate-600",
    },
    {
      name: "Premium",
      price: "50.000",
      description: "Pour maximiser vos chances de réussite",
      features: [
        "CV optimisé par IA",
        "Préparation d'entretien illimitée",
        "Candidatures illimitées",
        "Offres premium en priorité",
        "Alertes personnalisées",
        "Support prioritaire 24/7",
        "Coaching carrière",
        "Analyse de profil approfondie",
      ],
      buttonText: "Passer à Premium",
      buttonVariant: "solid",
      popular: true,
      gradient: "from-[#E31E24] to-[#ff3333]",
    },
  ];

  const stats = [
    { value: "2000+", label: "Candidats inscrits" },
    { value: "500+", label: "Offres d'emploi" },
    { value: "85%", label: "Taux de réussite" },
    { value: "24/7", label: "Support disponible" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-[#003087] transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Retour à l'accueil</span>
          </Link>
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="ProJob AI" className="h-12 w-auto" />
          </Link>
        </div>
      </div>

      <div className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#003087]/10 to-[#E31E24]/10 px-6 py-3 rounded-full mb-6 border border-[#003087]/20">
              <Rocket className="h-5 w-5 text-[#E31E24]" />
              <span className="font-semibold text-[#003087]">Boostez votre carrière dès aujourd'hui</span>
            </div>
            <h1 className="text-6xl font-bold mb-6">
              <span className="text-[#003087]">Choisissez votre</span>{" "}
              <span className="bg-gradient-to-r from-[#E31E24] to-[#ff3333] bg-clip-text text-transparent">formule</span>
            </h1>
            <p className="text-2xl text-slate-600 max-w-3xl mx-auto">
              Des solutions adaptées à vos besoins professionnels pour réussir votre carrière en Guinée
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-4 gap-6 mb-20 max-w-5xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-center bg-white rounded-2xl p-6 border-2 border-slate-100 shadow-lg"
              >
                <div className="text-4xl font-bold bg-gradient-to-r from-[#003087] to-[#0047b3] bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto mb-20">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
                whileHover={{ y: -8 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl z-10">
                    <Sparkles className="h-5 w-5" />
                    Le plus populaire
                  </div>
                )}

                <div
                  className={`bg-white rounded-3xl p-10 h-full flex flex-col relative overflow-hidden ${
                    plan.popular
                      ? "border-2 border-[#E31E24] shadow-2xl shadow-[#E31E24]/30"
                      : "border-2 border-slate-200 shadow-xl"
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${plan.gradient} opacity-5 rounded-full blur-3xl`} />

                  <div className="relative mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} mb-4 shadow-lg`}>
                      {plan.popular ? (
                        <TrendingUp className="h-8 w-8 text-white" />
                      ) : (
                        <Users className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <h2 className="text-4xl font-bold text-[#003087] mb-3">
                      {plan.name}
                    </h2>
                    <p className="text-lg text-slate-600 mb-8">{plan.description}</p>
                    <div className="flex items-end gap-3 mb-2">
                      {plan.price === "0" ? (
                        <span className="text-6xl font-bold bg-gradient-to-r from-[#003087] to-[#0047b3] bg-clip-text text-transparent">
                          Gratuit
                        </span>
                      ) : (
                        <>
                          <span className="text-6xl font-bold bg-gradient-to-r from-[#E31E24] to-[#ff3333] bg-clip-text text-transparent">
                            {plan.price}
                          </span>
                          <span className="text-xl text-slate-600 mb-3 font-medium">GNF / mois</span>
                        </>
                      )}
                    </div>
                    {plan.popular && (
                      <p className="text-sm text-[#E31E24] font-semibold">Économisez 30% avec l'abonnement annuel</p>
                    )}
                  </div>

                  <div className="flex-1 mb-8 relative">
                    <div className="border-t-2 border-slate-100 pt-6 mb-6">
                      <p className="text-sm font-bold text-[#003087] mb-4">Fonctionnalités incluses :</p>
                    </div>
                    <ul className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <motion.li
                          key={feature}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + idx * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <div
                            className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md ${
                              plan.popular
                                ? "bg-gradient-to-br from-[#E31E24] to-[#ff3333]"
                                : "bg-gradient-to-br from-[#003087] to-[#0047b3]"
                            }`}
                          >
                            <Check className="h-5 w-5 text-white stroke-[3]" />
                          </div>
                          <span className="text-slate-700 text-lg leading-relaxed">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to="/profile-choice"
                    className={`relative block text-center px-8 py-5 rounded-2xl font-bold text-lg transition-all group overflow-hidden ${
                      plan.buttonVariant === "solid"
                        ? "bg-gradient-to-r from-[#E31E24] to-[#ff3333] text-white shadow-xl shadow-[#E31E24]/40 hover:shadow-2xl hover:shadow-[#E31E24]/50 hover:scale-[1.02]"
                        : "border-2 border-[#003087] text-[#003087] hover:bg-[#003087] hover:text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    <span className="relative z-10">{plan.buttonText}</span>
                    {plan.popular && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-[#ff3333] to-[#E31E24]"
                        initial={{ x: "100%" }}
                        whileHover={{ x: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mb-20"
          >
            <h2 className="text-4xl font-bold text-center mb-4">
              <span className="text-[#003087]">Pourquoi choisir</span>{" "}
              <span className="text-[#E31E24]">ProJob AI ?</span>
            </h2>
            <p className="text-center text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
              Découvrez les avantages qui font de ProJob AI votre meilleur allié professionnel
            </p>
            <div className="grid md:grid-cols-4 gap-6">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl p-6 border-2 border-slate-100 shadow-lg hover:shadow-2xl hover:border-[#003087]/30 transition-all group"
                >
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#003087] to-[#0047b3] flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <benefit.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#003087] mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center"
          >
            <div className="relative bg-gradient-to-br from-[#003087] to-[#0047b3] rounded-3xl p-12 shadow-2xl max-w-4xl mx-auto overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#E31E24]/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-6">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-white mb-4">
                  Des questions sur nos offres ?
                </h3>
                <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                  Notre équipe est disponible pour vous aider à choisir la formule qui vous convient le mieux.
                  Contactez-nous dès maintenant !
                </p>
                <a
                  href="mailto:contact@projob.ia"
                  className="inline-flex items-center gap-3 bg-white text-[#003087] px-10 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <span>Nous contacter</span>
                  <ArrowLeft className="h-5 w-5 rotate-180" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
