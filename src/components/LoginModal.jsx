import { useState } from 'react';
import { X } from 'lucide-react';
import { loginUser, registerUser } from '../services/firebase';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(email, password, { name, phone, role });
      }
      onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Помилка');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
        >
          <X size={24} className="text-slate-600" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {isLogin ? 'Вхід' : 'Реєстрація'}
          </h2>

          <div className="flex gap-2 mb-6 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-2 rounded font-medium transition ${
                isLogin ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Вхід
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 py-2 rounded font-medium transition ${
                !isLogin ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Реєстрація
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <>
                <input
                  type="text"
                  placeholder="Ім'я"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  required
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                  required
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
                >
                  <option value="customer">Клієнт</option>
                  <option value="manager">Менеджер</option>
                </select>
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-900"
              required
            />

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {loading ? 'Чекаємо...' : isLogin ? 'Увійти' : 'Зареєструватись'}
            </button>
          </form>

          {isLogin && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-2">Demo облік для адміна:</p>
              <p className="text-xs text-slate-500">
                <strong>Email:</strong> admin@admin.com<br />
                <strong>Password:</strong> admin123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
