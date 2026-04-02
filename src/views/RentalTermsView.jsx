import { CircleDollarSign, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';

const orderSteps = [
  {
    step: '01',
    title: 'Оберіть позиції',
    text: 'Перегляньте каталог, додайте товари в кошик і сформуйте попередній список для вашої події.',
  },
  {
    step: '02',
    title: 'Надішліть запит',
    text: 'Вкажіть дати оренди, кількість, формат заходу та контактні дані для швидкого підтвердження.',
  },
  {
    step: '03',
    title: 'Погодьте деталі',
    text: 'Менеджер уточнить наявність, вартість, логістику, монтаж і допоможе доповнити комплект.',
  },
  {
    step: '04',
    title: 'Отримайте замовлення',
    text: 'Самовивіз або доставка — у зручний час, з чіткими домовленостями щодо повернення.',
  },
];

const conditions = [
  {
    title: 'Оплата та гарантійний депозит',
    text: 'Розрахунок здійснюється в момент отримання інвентарю (при доставці або самовивозі). Він включає 100% оплату вартості оренди та внесення гарантійного платежу.',
    icon: CircleDollarSign,
  },
  {
    title: 'Доставка та професійний монтаж',
    text: 'Ваша подія може відбутися будь-де. Ми забезпечуємо доставку та монтаж посуду по всій території України. Вартість логістики та супутніх послуг розраховується додатково.',
    icon: Truck,
  },
  {
    title: 'Повернення депозиту',
    text: 'Гарантійний платіж повертається у повному обсязі протягом 3-х днів після зворотного прийому майна на наш склад та його перевірки.',
    icon: ShieldCheck,
  },
  {
    title: 'Професійний догляд та відповідальність',
    text: 'Вам не потрібно турбуватися про миття посуду після свята — послуга професійного клінінгу оплачується додатково. У разі втрати виробу або пошкоджень, які неможливо усунути, клієнт компенсує його повну відновлювальну вартість.',
    icon: Sparkles,
  },
];

export const RentalTermsView = () => {
  return (
    <main className="max-w-7xl mx-auto px-6 pt-0 pb-10 md:pb-12 animate-in fade-in duration-700">
      <section className="w-screen relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#081226] via-[#112248] to-[#081226] text-white px-6 pt-3 pb-5 md:pt-4 md:pb-6 mb-8 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200 text-xs font-bold uppercase tracking-[0.2em] mb-3">
            <PackageCheck size={14} />
            Rental terms
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">Оренда та умови</h1>
          <p className="text-slate-300 max-w-4xl text-sm md:text-base leading-relaxed">
            Ми дбаємо про те, щоб ідеальне сервірування вашої події супроводжувалося таким самим бездоганним сервісом.
            Для вашого комфорту та прозорості співпраці діють наступні правила.
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-[30px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="max-w-2xl mb-6">
          <p className="text-cyan-700 text-xs font-bold uppercase tracking-[0.25em] mb-2">Крок за кроком</p>
          <h2 className="text-2xl md:text-3xl font-black uppercase text-[#081226] mb-3">Як зробити замовлення?</h2>
          <p className="text-slate-600 leading-relaxed">
            Навіть якщо ви ще не впевнені у фінальному списку, надішліть запит — менеджер допоможе з комплектацією та підбере оптимальний варіант.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {orderSteps.map((item) => (
            <div key={item.step} className="rounded-[24px] bg-slate-50 border border-slate-200 p-5 md:p-6">
              <div className="text-3xl font-black text-[#081226] mb-3">{item.step}</div>
              <h3 className="text-lg font-black uppercase text-[#081226] mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="max-w-4xl mb-5">
          <p className="text-cyan-700 text-xs font-bold uppercase tracking-[0.25em] mb-2">Важливо знати</p>
          <h2 className="text-2xl md:text-3xl font-black uppercase text-[#081226] mb-3">Умови оренди</h2>
          <p className="text-slate-600 leading-relaxed">
            Ми дбаємо про те, щоб ідеальне сервірування вашої події супроводжувалося таким самим бездоганним сервісом. Для вашого комфорту та прозорості співпраці діють наступні правила:
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {conditions.map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-[26px] border border-slate-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-[#081226] text-cyan-200 flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-black uppercase text-[#081226] mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] bg-gradient-to-r from-[#081226] via-[#0d1c3c] to-[#081226] text-white p-6 md:p-8 border border-slate-800 shadow-xl">
        <p className="text-cyan-200 text-xs font-bold uppercase tracking-[0.25em] mb-3">Потрібна допомога?</p>
        <h2 className="text-2xl md:text-3xl font-black uppercase mb-3">Зв'яжіться з менеджером</h2>
        <p className="text-slate-300 max-w-3xl leading-relaxed mb-4">
          Якщо потрібна консультація щодо наявності, доставки, застави чи догляду за позиціями — напишіть або зателефонуйте,
          і ми швидко зорієнтуємо по найкращому рішенню для вашого заходу.
        </p>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <span className="px-3 py-2 rounded-full bg-white/10 border border-white/10">044 333 89 48</span>
          <span className="px-3 py-2 rounded-full bg-white/10 border border-white/10">rent@rentco.com.ua</span>
          <span className="px-3 py-2 rounded-full bg-white/10 border border-white/10">Київ та область</span>
        </div>
      </section>
    </main>
  );
};
