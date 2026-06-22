import { NextRequest, NextResponse } from 'next/server'
import { complete, aiConfigured } from '@/lib/ai'
import { rateLimit, getIp } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getIp(req))) {
      return NextResponse.json({ error: 'Слишком много запросов. Подождите минуту.' }, { status: 429 })
    }
    const { goal, weight, height, age, gender, budget, restrictions, days = 7 } = await req.json()
    if (!goal || !weight) {
      return NextResponse.json({ error: 'Укажите цель и вес' }, { status: 400 })
    }
    if (!aiConfigured()) {
      return NextResponse.json({ error: 'Сервис не настроен (нет AI-ключа)' }, { status: 503 })
    }

    const system = `Ты — диетолог. Составь план питания на ${days} дней.
Отвечай СТРОГО в формате JSON без markdown:
{
  "dailyCalories": 2000,
  "macros": { "protein": 150, "fat": 60, "carbs": 200 },
  "days": [
    {
      "day": "День 1",
      "meals": [
        { "type": "Завтрак", "name": "название блюда", "kcal": 400, "recipe": "краткий рецепт" }
      ]
    }
  ],
  "groceryList": ["продукт — кол-во", ...]
}
Учитывай российские продукты и цены. 4 приёма пищи в день. Пиши на русском.`

    const user = `Цель: ${goal}
Вес: ${weight} кг, рост: ${height || '?'} см, возраст: ${age || '?'}, пол: ${gender || '?'}
Бюджет: ${budget || 'средний'}
Ограничения/непереносимости: ${restrictions || 'нет'}`

    const raw = await complete({ system, user, json: true, temperature: 0.7 })
    const data = JSON.parse(raw || '{}')
    return NextResponse.json(data)
  } catch (err) {
    console.error('plan error:', err)
    return NextResponse.json({ error: 'Ошибка обработки. Попробуйте ещё раз.' }, { status: 500 })
  }
}
