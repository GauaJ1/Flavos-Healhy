/**
 * OnboardingModal — Tela de configuração de perfil físico do usuário.
 *
 * Coleta: nome, ano de nascimento, sexo, altura, peso, nível de atividade, objetivo.
 * Calcula TMB/TDEE e salva metas calóricas personalizadas no localStorage.
 * Segue os princípios de UX empático (Documentacao_Tecnica.md).
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile, ActivityLevel, Goal, Sex } from '../hooks/useUserProfile';
import { calcTargets, saveUserProfile, carbLoadStrategy } from '../hooks/useUserProfile';
import { saveGoals } from '../hooks/useDailyStats';

interface Props {
  onComplete: (profile: UserProfile) => void;
  onSkip?: () => void;
}

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { value: 'sedentario',    label: 'Sedentário',      desc: 'Pouco ou nenhum exercício',      emoji: '🛋️' },
  { value: 'leve',          label: 'Leve',            desc: '1–3 dias de exercício por semana', emoji: '🚶' },
  { value: 'moderado',      label: 'Moderado',        desc: '3–5 dias de exercício por semana', emoji: '🏃' },
  { value: 'intenso',       label: 'Intenso',         desc: '6–7 dias de exercício pesado',    emoji: '💪' },
  { value: 'muito_intenso', label: 'Muito Intenso',   desc: 'Atleta ou trabalho físico pesado', emoji: '🏋️' },
];

const GOAL_OPTIONS: { value: Goal; label: string; desc: string; emoji: string; delta: string }[] = [
  { value: 'perder_peso',  label: 'Perder Peso',    desc: 'Déficit moderado de 300 kcal/dia', emoji: '📉', delta: '−300 kcal' },
  { value: 'manter',       label: 'Manter Peso',    desc: 'Manter o peso atual',              emoji: '⚖️', delta: '±0 kcal' },
  { value: 'ganhar_massa', label: 'Ganhar Massa',   desc: 'Superávit moderado de 300 kcal',  emoji: '📈', delta: '+300 kcal' },
];

const STEPS = ['boas_vindas', 'basico', 'medidas', 'atividade', 'objetivo', 'resultado'] as const;
type Step = typeof STEPS[number];

const OnboardingModal: React.FC<Props> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<Step>('boas_vindas');
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState(1995);
  const [sex, setSex] = useState<Sex>('M');
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderado');
  const [goal, setGoal] = useState<Goal>('manter');
  const [bodyFatPct, setBodyFatPct] = useState<number | undefined>(undefined);
  const [enableBodyFat, setEnableBodyFat] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  const profile: UserProfile = {
    name,
    birthYear,
    sex,
    heightCm,
    weightKg,
    activityLevel,
    goal,
    bodyFatPct: enableBodyFat ? bodyFatPct : undefined,
  };
  const targets = calcTargets(profile);

  const handleComplete = () => {
    saveUserProfile(profile);
    saveGoals({
      calories: targets.targetKcal,
      protein: targets.targetProtein_g,
      carbohydrates: targets.targetCarbs_g,
      fat: targets.targetFat_g,
    });
    onComplete(profile);
  };

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const slide = { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -30 } };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-0 md:pb-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700/60 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-800 w-full">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="p-6 pb-8">
          <AnimatePresence mode="wait">
            {/* ── Boas-vindas ─────────────────────────────────────────── */}
            {step === 'boas_vindas' && (
              <motion.div key="boas_vindas" variants={slide} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center text-center gap-5">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl">
                  🥗
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo ao Flavos Healthy</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Para personalizar suas metas de calorias e macronutrientes, precisamos de algumas informações físicas básicas.<br/><br/>
                    <span className="text-gray-500 text-xs">Esses dados ficam apenas no seu dispositivo e nunca são enviados a servidores.</span>
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full mt-2">
                  <button onClick={next} className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-900/30">
                    Personalizar metas
                  </button>
                  {onSkip && (
                    <button onClick={onSkip} className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-400 transition-colors">
                      Usar metas padrão por agora
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Básico ───────────────────────────────────────────────── */}
            {step === 'basico' && (
              <motion.div key="basico" variants={slide} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Informações básicas</h3>
                  <p className="text-gray-500 text-sm">Como você quer ser chamado?</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Nome (opcional)</label>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Ano de nascimento</label>
                    <input
                      type="number"
                      min={1930} max={2010}
                      value={birthYear}
                      onChange={e => setBirthYear(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <p className="text-xs text-gray-600 mt-1">Idade calculada: {new Date().getFullYear() - birthYear} anos</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-2 block">Sexo biológico</label>
                    <div className="flex gap-2">
                      {([['M','Masculino','♂️'],['F','Feminino','♀️'],['O','Outro','⚧️']] as [Sex,string,string][]).map(([v,l,e]) => (
                        <button
                          key={v}
                          onClick={() => setSex(v)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${sex === v ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                        >
                          <span className="block text-base mb-0.5">{e}</span>
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">Usado apenas para cálculo de TMB via Mifflin-St Jeor.</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={back} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 font-medium border border-gray-700 hover:bg-gray-700">Voltar</button>
                  <button onClick={next} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all">Continuar</button>
                </div>
              </motion.div>
            )}

            {/* ── Medidas ───────────────────────────────────────────────── */}
            {step === 'medidas' && (
              <motion.div key="medidas" variants={slide} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Medidas corporais</h3>
                  <p className="text-gray-500 text-sm">Para calcular sua necessidade calórica diária.</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Altura (cm)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={140} max={220} value={heightCm}
                        onChange={e => setHeightCm(Number(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="w-16 text-right text-white font-bold text-lg">{heightCm} cm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Peso atual (kg)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={40} max={200} value={weightKg}
                        onChange={e => setWeightKg(Number(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="w-16 text-right text-white font-bold text-lg">{weightKg} kg</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-gray-400 font-medium block">Gordura Corporal (%BF)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setEnableBodyFat(!enableBodyFat);
                          if (!enableBodyFat && bodyFatPct === undefined) {
                            setBodyFatPct(15);
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                          enableBodyFat
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        {enableBodyFat ? 'Usar Cunningham' : 'Opcional (BF)'}
                      </button>
                    </div>
                    {enableBodyFat && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <input
                          type="range" min={3} max={50} value={bodyFatPct ?? 15}
                          onChange={e => setBodyFatPct(Number(e.target.value))}
                          className="flex-1 accent-emerald-500"
                        />
                        <span className="w-16 text-right text-white font-bold text-lg">{bodyFatPct ?? 15}%</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
                    <p className="text-xs text-gray-500 mb-1">
                      Prévia da sua taxa metabólica basal (TMB) · {targets.isCunningham ? 'Cunningham' : 'Mifflin'}
                    </p>
                    <p className="text-emerald-400 font-bold text-xl">{targets.tmbKcal} kcal/dia</p>
                    <p className="text-xs text-gray-600">Calorias mínimas para funções vitais em repouso</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={back} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 font-medium border border-gray-700 hover:bg-gray-700">Voltar</button>
                  <button onClick={next} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all">Continuar</button>
                </div>
              </motion.div>
            )}

            {/* ── Atividade ─────────────────────────────────────────────── */}
            {step === 'atividade' && (
              <motion.div key="atividade" variants={slide} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Nível de atividade</h3>
                  <p className="text-gray-500 text-sm">Considere sua rotina habitual das últimas semanas.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {ACTIVITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setActivityLevel(opt.value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${activityLevel === opt.value ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                    >
                      <span className="text-2xl w-8 text-center">{opt.emoji}</span>
                      <div>
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                      {activityLevel === opt.value && <div className="ml-auto w-3 h-3 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={back} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 font-medium border border-gray-700 hover:bg-gray-700">Voltar</button>
                  <button onClick={next} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all">Continuar</button>
                </div>
              </motion.div>
            )}

            {/* ── Objetivo ─────────────────────────────────────────────── */}
            {step === 'objetivo' && (
              <motion.div key="objetivo" variants={slide} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Qual é seu objetivo?</h3>
                  <p className="text-gray-500 text-sm">Isso ajusta sua meta calórica diária.</p>
                </div>
                <div className="flex flex-col gap-3">
                  {GOAL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGoal(opt.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${goal === opt.value ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${goal === opt.value ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-500'}`}>{opt.delta}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={back} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-400 font-medium border border-gray-700 hover:bg-gray-700">Voltar</button>
                  <button onClick={next} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all">Ver minha meta</button>
                </div>
              </motion.div>
            )}

            {/* ── Resultado ────────────────────────────────────────────── */}
            {step === 'resultado' && (
              <motion.div key="resultado" variants={slide} initial="hidden" animate="visible" exit="exit" className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {name ? `Suas metas, ${name}!` : 'Suas metas personalizadas!'}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Calculado via {targets.isCunningham ? 'fórmula de Cunningham' : 'fórmula Mifflin-St Jeor'}.
                  </p>
                </div>

                <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-2xl p-5">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Meta calórica diária</p>
                  <p className="text-4xl font-bold text-white">{targets.targetKcal}<span className="text-lg text-gray-400 font-normal"> kcal</span></p>
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 bg-gray-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">TMB</p>
                      <p className="text-sm font-bold text-gray-300">{targets.tmbKcal}</p>
                    </div>
                    <div className="flex-1 bg-gray-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-xs text-gray-500">TDEE</p>
                      <p className="text-sm font-bold text-gray-300">{targets.tdeeKcal}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Proteína', g: targets.targetProtein_g, color: 'text-blue-400', pct: `${Math.round((targets.targetProtein_g * 4 / (targets.targetProtein_g * 4 + targets.targetCarbs_g * 4 + targets.targetFat_g * 9)) * 100)}%` },
                    { label: 'Carbs', g: targets.targetCarbs_g, color: 'text-yellow-400', pct: `${Math.round((targets.targetCarbs_g * 4 / (targets.targetProtein_g * 4 + targets.targetCarbs_g * 4 + targets.targetFat_g * 9)) * 100)}%` },
                    { label: 'Gordura', g: targets.targetFat_g, color: 'text-orange-400', pct: `${Math.round((targets.targetFat_g * 9 / (targets.targetProtein_g * 4 + targets.targetCarbs_g * 4 + targets.targetFat_g * 9)) * 100)}%` },
                  ].map(m => (
                    <div key={m.label} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 text-center">
                      <p className="text-xs text-gray-500">{m.label}</p>
                      <p className={`text-lg font-bold ${m.color}`}>{m.g}g</p>
                      <p className="text-xs text-gray-600">{m.pct}</p>
                    </div>
                  ))}
                </div>

                {/* Carb Load strategy tip if g/kg > 6 */}
                {targets.targetCarbs_g / weightKg > 6 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mt-3 text-left">
                    <p className="text-xs font-bold text-emerald-400 mb-1">💡 Estratégia de Carga de Carbo ({Math.round(targets.targetCarbs_g / weightKg)} g/kg)</p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {carbLoadStrategy(targets.targetCarbs_g, weightKg, 4).tip}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-600 text-center mt-3">
                  Estas são estimativas educacionais. Para orientação clínica, consulte um nutricionista.
                </p>

                <button onClick={handleComplete} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-emerald-900/30 mt-3">
                  Começar! 🚀
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingModal;
