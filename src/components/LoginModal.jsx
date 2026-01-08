import { useState } from 'react';
import { X } from 'lucide-react';
import { loginUser, registerUser, fetchUserProfileByUid } from '../services/firebase';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
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
      let userCredential;
      if (isLogin) {
        userCredential = await loginUser(email, password);
      } else {
        userCredential = await registerUser(email, password, { name, phone });
      }
      // Підтягуємо профіль одразу після логіну
      const uid = userCredential?.user?.uid || (userCredential && userCredential.uid);
      let profile = null;
      if (uid) {
        profile = await fetchUserProfileByUid(uid);
      }
      onLoginSuccess(profile);
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
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                  required
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition placeholder-gray-400 text-gray-900 font-semibold"
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
