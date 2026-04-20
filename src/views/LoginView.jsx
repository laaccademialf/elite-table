import { useState } from 'react';
import { loginUser, registerUser } from '../services/firebase';

export default function LoginView({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        await loginUser(email, password);
      } else {
        // Register
        await registerUser(email, password, { name, phone });
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#131C4E] to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131C4E] text-white rounded-3xl shadow-xl p-8 border border-slate-700">
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300 mb-2">LaFamiglia Rentco</p>
          <h1 className="text-4xl font-bold text-white mb-2">LaFamiglia Rentco</h1>
          <p className="text-slate-300">Преміальна оренда посуду для вашого свята</p>
        </div>

        <div className="flex gap-4 mb-8 bg-slate-900 rounded-xl p-1 border border-slate-700">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              isLogin
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Вхід
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              !isLogin
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Реєстрація
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Повне ім'я"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                required
              />
              <input
                type="tel"
                placeholder="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                required
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
            required
          />

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500 text-slate-950 rounded-xl font-bold hover:bg-cyan-400 disabled:opacity-50 transition"
          >
            {loading ? 'Чекаємо...' : isLogin ? 'Увійти' : 'Зареєструватись'}
          </button>
        </form>
      </div>
    </div>
  );
}
