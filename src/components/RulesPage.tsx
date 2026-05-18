import { useState, useEffect } from 'react';

interface Props {
  onBack: () => void;
  isOwner: boolean;
}

const STORAGE_KEY = 'moai_rules';
const API_URL = window.location.origin + '/api';

interface Rule {
  id: string;
  text: string;
  level: 'red' | 'yellow' | 'green';
  category: string;
}

const DEFAULT_RULES: Rule[] = [
  { id: '1', text: 'Пользователь обязуется не отправлять контент, пропагандирующий насилие, жестокость, терроризм, экстремизм или иные действия, запрещённые законодательством Российской Федерации и международным правом.', level: 'red', category: 'Запрещённый контент' },
  { id: '2', text: 'Категорически запрещено использование сервиса для распространения информации о наркотических средствах, психотропных веществах и их аналогах, а также способах их изготовления и приобретения.', level: 'red', category: 'Запрещённый контент' },
  { id: '3', text: 'Запрещена отправка материалов, содержащих порнографию, детскую эксплуатацию, а также любой контент сексуального характера с участием несовершеннолетних.', level: 'red', category: 'Запрещённый контент' },
  { id: '4', text: 'Пользователь не имеет права использовать сервис для генерации вредоносного программного обеспечения, фишинговых сообщений, мошеннических схем и иных инструментов киберпреступлений.', level: 'red', category: 'Запрещённый контент' },
  { id: '5', text: 'Запрещён спам, флуд, массовая рассылка однотипных сообщений и любые действия, направленные на нарушение работоспособности сервиса.', level: 'red', category: 'Запрещённый контент' },
  { id: '6', text: 'Сервис MoAI Studio предоставляет информацию справочного характера. Ответы искусственного интеллекта не являются профессиональной медицинской, юридической, финансовой или иной консультацией.', level: 'yellow', category: 'Ограничение ответственности' },
  { id: '7', text: 'Администрация сервиса не несёт ответственности за точность, полноту и актуальность предоставляемой нейросетью информации. Пользователь принимает решения на основании ответов ИИ на собственный риск.', level: 'yellow', category: 'Ограничение ответственности' },
  { id: '8', text: 'При получении медицинской информации от нейросети пользователь обязан обратиться к квалифицированному специалисту для подтверждения диагноза и назначения лечения.', level: 'yellow', category: 'Ограничение ответственности' },
  { id: '9', text: 'Сервис предоставляется по принципу "как есть" (as is) без каких-либо гарантий бесперебойной работы, доступности или сохранности данных.', level: 'yellow', category: 'Ограничение ответственности' },
  { id: '10', text: 'Администрация не несёт ответственности за любые прямые или косвенные убытки, возникшие в результате использования или невозможности использования сервиса.', level: 'yellow', category: 'Ограничение ответственности' },
  { id: '11', text: 'Пароли пользователей хешируются с использованием алгоритма bcrypt и не хранятся в открытом виде. Доступ к базе данных ограничен и защищён SSL-шифрованием.', level: 'green', category: 'Защита данных' },
  { id: '12', text: 'Персональные данные пользователей (имя, email) используются исключительно для идентификации в системе и не передаются третьим лицам.', level: 'green', category: 'Защита данных' },
  { id: '13', text: 'Загруженные изображения и видео обрабатываются нейросетью для анализа содержимого. Сервис оставляет за собой право отклонять материалы, нарушающие настоящие правила.', level: 'green', category: 'Защита данных' },
  { id: '14', text: 'История чатов хранится локально в браузере пользователя. Администрация не имеет доступа к содержимому переписок.', level: 'green', category: 'Защита данных' },
  { id: '15', text: 'Пользователь предоставляет сервису неисключительное право на обработку отправленных материалов в целях улучшения качества работы нейросети.', level: 'yellow', category: 'Интеллектуальная собственность' },
  { id: '16', text: 'Все права на программное обеспечение, дизайн и архитектуру сервиса MoAI Studio принадлежат его создателям и защищены законодательством об интеллектуальной собственности.', level: 'yellow', category: 'Интеллектуальная собственность' },
  { id: '17', text: 'Копирование, модификация, распространение или воспроизведение элементов сервиса без письменного согласия правообладателя запрещено.', level: 'red', category: 'Интеллектуальная собственность' },
  { id: '18', text: 'Администрация оставляет за собой право в одностороннем порядке изменять, дополнять или удалять пункты настоящих правил без предварительного уведомления пользователей.', level: 'yellow', category: 'Условия использования' },
  { id: '19', text: 'Продолжая использование сервиса после внесения изменений в правила, пользователь автоматически соглашается с их новой редакцией.', level: 'yellow', category: 'Условия использования' },
  { id: '20', text: 'Сервис бесплатен для использования. Администрация оставляет за собой право вводить платные функции в будущем с предварительным уведомлением.', level: 'green', category: 'Условия использования' },
  { id: '21', text: 'При нарушении настоящих правил администрация оставляет за собой право ограничить или заблокировать доступ пользователя к сервису без объяснения причин.', level: 'red', category: 'Условия использования' },
  { id: '22', text: 'Для разрешения споров применяется законодательство Российской Федерации. Досудебный порядок урегулирования споров обязателен.', level: 'green', category: 'Условия использования' },
];

function loadRules(): Rule[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : DEFAULT_RULES; } catch { return DEFAULT_RULES; }
}

function saveRules(rules: Rule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  fetch(`${API_URL}/save-rules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules }) }).catch(() => {});
}



export default function RulesPage({ onBack, isOwner }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editLevel, setEditLevel] = useState<'red' | 'yellow' | 'green'>('green');
  const [editCat, setEditCat] = useState('');
  const [addMode, setAddMode] = useState(false);

  useEffect(() => { setRules(loadRules()); }, []);

  const categories = [...new Set(rules.map(r => r.category))];

  const save = (id: string) => { const u = rules.map(r => r.id === id ? { ...r, text: editText, level: editLevel, category: editCat } : r); setRules(u); saveRules(u); setEditId(null); };
  const add = () => { const u = [...rules, { id: Math.random().toString(36).slice(2), text: editText, level: editLevel, category: editCat || 'Общее' }]; setRules(u); saveRules(u); setAddMode(false); setEditText(''); setEditCat(''); };
  const del = (id: string) => { const u = rules.filter(r => r.id !== id); setRules(u); saveRules(u); };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#fafafa' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={onBack} className="text-sm text-blue-500 hover:text-blue-700 font-medium mb-6 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Назад
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Правила и политика MoAI Studio</h1>
        <p className="text-sm text-gray-400 mb-8">Пользовательское соглашение, правила использования и защита данных</p>



        {categories.map(cat => {
          const catRules = rules.filter(r => r.category === cat);
          const catLevel = catRules[0]?.level || 'green';
          return (
            <div key={cat} className="mb-8">
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3 px-3 py-1.5 rounded-lg inline-block"
                style={{ background: catLevel === 'red' ? 'rgba(239,68,68,0.12)' : catLevel === 'yellow' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)', color: catLevel === 'red' ? '#dc2626' : catLevel === 'yellow' ? '#d97706' : '#16a34a' }}
              >
                {cat}
              </h3>
              {catRules.map((rule, idx) => (
                <div key={rule.id} className="py-3 flex items-start gap-3" style={{ borderBottom: idx < catRules.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <span className="text-xs text-gray-600 mt-0.5 w-6 flex-shrink-0">{idx + 1}.</span>
                  {editId === rule.id && isOwner ? (
                    <div className="flex-1">
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full text-sm bg-white rounded-lg p-2 outline-none border border-gray-200" rows={3} />
                      <div className="flex gap-2 mt-2">
                        <select value={editLevel} onChange={e => setEditLevel(e.target.value as any)} className="text-xs bg-white border rounded px-2 py-1"><option value="red">Строгий</option><option value="yellow">Важное</option><option value="green">Инфо</option></select>
                        <input value={editCat} onChange={e => setEditCat(e.target.value)} placeholder="Категория" className="text-xs bg-white border rounded px-2 py-1 flex-1" />
                        <button onClick={() => save(rule.id)} className="text-xs text-green-600 font-medium">Сохранить</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400">Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-600 leading-relaxed">{rule.text}</p>
                      {isOwner && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => { setEditId(rule.id); setEditText(rule.text); setEditLevel(rule.level); setEditCat(rule.category); }} className="text-[10px] text-gray-400 hover:text-gray-600">ред.</button>
                          <button onClick={() => del(rule.id)} className="text-[10px] text-red-400 hover:text-red-600">уд.</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {isOwner && (
          addMode ? (
            <div className="rounded-xl p-4 bg-white border border-gray-200 mt-4">
              <textarea value={editText} onChange={e => setEditText(e.target.value)} placeholder="Текст правила..." className="w-full text-sm bg-gray-50 rounded-lg p-2 outline-none border mb-2" rows={3} />
              <div className="flex gap-2">
                <select value={editLevel} onChange={e => setEditLevel(e.target.value as any)} className="text-xs border rounded px-2 py-1"><option value="red">Строгий</option><option value="yellow">Важное</option><option value="green">Инфо</option></select>
                <input value={editCat} onChange={e => setEditCat(e.target.value)} placeholder="Категория" className="text-xs border rounded px-2 py-1 flex-1" />
                <button onClick={add} className="text-xs text-green-600 font-medium">Добавить</button>
                <button onClick={() => { setAddMode(false); setEditText(''); }} className="text-xs text-gray-400">Отмена</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddMode(true)} className="text-sm text-blue-500 hover:text-blue-700 font-medium mt-2">+ Добавить правило</button>
          )
        )}

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">MoAI Studio. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
}
