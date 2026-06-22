'use client'
import { useState, useEffect } from 'react'
import { remaining, canUse, recordUse, FREE_LIMIT } from '@/lib/freemium'

const UPGRADE_URL = process.env.NEXT_PUBLIC_STRIPE_URL || '#'

interface Meal { type: string; name: string; kcal: number; recipe: string }
interface Day { day: string; meals: Meal[] }
interface Plan {
  dailyCalories: number
  macros: { protein: number; fat: number; carbs: number }
  days: Day[]
  groceryList: string[]
}

export default function Home() {
  const [goal, setGoal] = useState('похудение')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('мужской')
  const [budget, setBudget] = useState('средний')
  const [restrictions, setRestrictions] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => { setLeft(remaining()) }, [])

  async function run() {
    if (!weight) { setError('Укажите вес'); return }
    if (!canUse()) { setError('limit'); return }
    setLoading(true); setError(''); setPlan(null)
    const res = await fetch('/api/plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, weight, height, age, gender, budget, restrictions }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Ошибка'); setLoading(false); return }
    recordUse(); setLeft(remaining()); setPlan(data); setLoading(false)
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-lime-500'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2"><span className="text-2xl">🥗</span><span className="font-bold text-xl">MealAI</span></div>
        {left !== null && <span className="text-zinc-400 text-sm">Осталось: <span className="text-lime-400 font-semibold">{left}</span>/{FREE_LIMIT}</span>}
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-12 pb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">План питания<br /><span className="text-lime-400">на неделю</span></h1>
        <p className="text-zinc-400 text-lg">Меню с КБЖУ, рецептами и списком покупок под вашу цель и бюджет.</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20 space-y-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <select value={goal} onChange={e => setGoal(e.target.value)} className={inputCls}>
              <option value="похудение">Похудение</option>
              <option value="набор массы">Набор массы</option>
              <option value="поддержание">Поддержание</option>
            </select>
            <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
              <option value="мужской">Мужской</option>
              <option value="женский">Женский</option>
            </select>
            <input className={inputCls} placeholder="Вес, кг *" value={weight} onChange={e => setWeight(e.target.value)} type="number" />
            <input className={inputCls} placeholder="Рост, см" value={height} onChange={e => setHeight(e.target.value)} type="number" />
            <input className={inputCls} placeholder="Возраст" value={age} onChange={e => setAge(e.target.value)} type="number" />
            <select value={budget} onChange={e => setBudget(e.target.value)} className={inputCls}>
              <option value="экономный">Эконом</option>
              <option value="средний">Средний</option>
              <option value="высокий">Высокий</option>
            </select>
          </div>
          <input className={inputCls} placeholder="Непереносимости (опционально)" value={restrictions} onChange={e => setRestrictions(e.target.value)} />
          <button onClick={run} disabled={loading || !weight}
            className="w-full bg-lime-600 hover:bg-lime-700 font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⟳</span> Составляю план...</> : 'Составить план →'}
          </button>
          {error === 'limit' ? (
            <div className="bg-zinc-800 rounded-xl p-5 text-center">
              <p className="font-semibold mb-2">Лимит исчерпан</p>
              <p className="text-zinc-400 text-sm mb-4">Безлимит — $9/мес</p>
              <a href={UPGRADE_URL} className="inline-block bg-lime-600 hover:bg-lime-700 font-semibold px-6 py-3 rounded-xl">Перейти на Pro →</a>
            </div>
          ) : error ? <p className="text-red-400 text-sm">{error}</p> : null}
        </div>

        {plan && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex gap-4 text-center">
              <Stat label="Ккал/день" value={plan.dailyCalories} />
              <Stat label="Белки" value={plan.macros?.protein + 'г'} />
              <Stat label="Жиры" value={plan.macros?.fat + 'г'} />
              <Stat label="Углеводы" value={plan.macros?.carbs + 'г'} />
            </div>
            {plan.days?.map((d, i) => (
              <div key={i} className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold text-lime-300 mb-2">{d.day}</h3>
                <div className="space-y-2">
                  {d.meals?.map((m, j) => (
                    <div key={j} className="bg-zinc-800 rounded-xl p-3">
                      <div className="flex justify-between"><span className="font-medium text-sm">{m.type}: {m.name}</span><span className="text-lime-400 text-sm">{m.kcal} ккал</span></div>
                      {m.recipe && <p className="text-zinc-400 text-xs mt-1">{m.recipe}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {plan.groceryList?.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold mb-2">🛒 Список покупок</h3>
                <ul className="grid grid-cols-2 gap-1">{plan.groceryList.map((g, i) => <li key={i} className="text-zinc-300 text-sm">• {g}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex-1 bg-zinc-800 rounded-xl py-3">
      <div className="text-lime-400 font-bold">{value}</div>
      <div className="text-zinc-500 text-xs">{label}</div>
    </div>
  )
}
