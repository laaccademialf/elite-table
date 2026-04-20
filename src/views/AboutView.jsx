import { Award, CheckCircle2, Package2, Palette, Sparkles, Users } from 'lucide-react';

const stats = [
  { value: '2000+', label: 'позицій для оренди' },
  { value: '450+', label: 'подій щороку' },
  { value: '13000+', label: 'гостей з красивою сервіровкою' },
  { value: '17000+', label: 'одиниць інвентарю в роботі' },
  { value: '12000+', label: 'годин підготовки та сервісу' },
];

const categories = [
  { title: 'Декор', text: 'Арки, вази, свічники, сервірувальні акценти та деталі для wow-ефекту.', icon: Palette },
  { title: 'Текстиль', text: 'Скатертини, серветки, ранери та тканини, що збирають цілісний стиль події.', icon: Sparkles },
  { title: 'Інвентар', text: 'Посуд, келихи, столові прибори та банкетні дрібниці для комфортної подачі.', icon: Package2 },
  { title: 'Обладнання', text: 'Практичні рішення для кейтерингу, зонування, сервірування та монтажу.', icon: Award },
];

const reasons = [
  'Підбираємо рішення під формат події, бюджет і стиль.',
  'Працюємо швидко, акуратно та з фокусом на деталі.',
  'Допомагаємо з комплектацією, логістикою та рекомендаціями.',
];

export const AboutView = () => {
  return (
    <main className="max-w-7xl mx-auto px-6 pt-0 pb-10 md:pb-12 animate-in fade-in duration-700">
      <section className="w-screen relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#131C4E] via-[#1a2766] to-[#131C4E] text-white px-6 pt-3 pb-5 md:pt-4 md:pb-6 mb-8 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">Про нас</h1>
          <p className="text-slate-300 max-w-3xl text-sm md:text-base leading-relaxed">
            LaFamiglia Rentco — це оренда декору, текстилю, посуду та інвентарю для подій,
            де важливі стиль, сервіс і відчуття продуманості в кожній деталі.
          </p>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-6">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black uppercase text-[#131C4E] mb-4">Наші переваги</h2>
          <p className="text-slate-600 leading-relaxed mb-5">
            Ми створюємо оренду без зайвого стресу: від першого запиту до видачі, доставки та повернення.
            Наша команда допомагає зібрати цілісну картину події так, щоб усе виглядало дорого, гармонійно й вчасно.
          </p>

          <div className="space-y-3">
            {reasons.map((reason) => (
              <div key={reason} className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                <CheckCircle2 className="text-[#131C4E] mt-0.5 shrink-0" size={18} />
                <p className="text-sm text-slate-700">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] bg-[#131C4E] text-white p-6 md:p-8 shadow-xl border border-slate-800">
          <p className="text-white text-xs font-bold uppercase tracking-[0.25em] mb-3">LaFamiglia Rentco</p>
          <h3 className="text-2xl md:text-3xl font-black uppercase leading-tight mb-4">Естетика, сервіс і надійність в одному місці</h3>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-5">
            Комплектуємо камерні вечері, великі весілля, корпоративні події, фотозйомки та приватні свята.
            Працюємо так, щоб клієнту було легко обрати, забронювати й отримати потрібний результат.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-2xl font-black">24/7</div>
              <div className="text-xs text-slate-300 uppercase tracking-wide">супровід менеджера</div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-2xl font-black">Premium</div>
              <div className="text-xs text-slate-300 uppercase tracking-wide">якість подачі</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[26px] border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-[#131C4E]">{stat.value}</div>
              <p className="mt-2 text-sm text-slate-600 leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {categories.map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-[#131C4E] text-white flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-black uppercase text-[#131C4E] mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] bg-gradient-to-r from-[#131C4E] via-[#1a2766] to-[#131C4E] text-white p-6 md:p-8 border border-slate-800 shadow-xl">
        <div className="max-w-4xl">
          <p className="text-white text-xs font-bold uppercase tracking-[0.25em] mb-3">Інше в оренду</p>
          <h2 className="text-2xl md:text-3xl font-black uppercase mb-3">Збираємо подію комплексно</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Якщо вам потрібне більше, ніж просто окрема позиція з каталогу, ми допоможемо скомпонувати повний набір:
            від сервірування столу й текстилю до декоративних акцентів та технічного супроводу.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Весілля', 'Кейтеринг', 'Корпоративи', 'Фотозони', 'Приватні вечері', 'Зйомки'].map((item) => (
              <span key={item} className="px-3 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm font-medium">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
