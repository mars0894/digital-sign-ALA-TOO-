'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ru' | 'kg';

interface Translations {
  [key: string]: {
    en: string;
    ru: string;
    kg: string;
  };
}

const translations: Translations = {
  // Sidebar
  'nav.dashboard': { en: 'Dashboard', ru: 'Главная', kg: 'Башкы бет' },
  'nav.documents': { en: 'Documents', ru: 'Документы', kg: 'Документтер' },
  'nav.upload': { en: 'Upload', ru: 'Загрузить', kg: 'Жүктөө' },
  'nav.sign_out': { en: 'Sign Out', ru: 'Выйти', kg: 'Чыгуу' },
  'app.subtitle': { en: 'Digital Signature Platform', ru: 'Платформа цифровой подписи', kg: 'Санариптик кол тамга платформасы' },

  // Docs Page
  'docs.title': { en: 'Documents', ru: 'Документы', kg: 'Документтер' },
  'docs.total_count': { en: 'Total Documents', ru: 'Всего документов', kg: 'Жалпы документтер' },
  'docs.total': { en: '{count} documents total', ru: 'Всего документов: {count}', kg: 'Жалпы {count} документ' },
  'docs.upload_pdf': { en: 'Upload PDF', ru: 'Загрузить PDF', kg: 'PDF жүктөө' },
  'docs.search': { en: 'Search documents...', ru: 'Поиск документов...', kg: 'Документтерди издөө...' },
  'docs.loading': { en: 'Loading documents...', ru: 'Загрузка...', kg: 'Жүктөлүүдө...' },
  'docs.no_docs': { en: 'No documents yet. Upload your first PDF!', ru: 'Пока нет документов. Загрузите первый PDF!', kg: 'Документтер жок. Биринчи PDF жүктөөңүз!' },
  'docs.no_match': { en: 'No documents match your search.', ru: 'Нет документов по вашему запросу.', kg: 'Издөөңүзгө дал келген документ жок.' },
  
  // Status
  'status.all': { en: 'All', ru: 'Все', kg: 'Баардыгы' },
  'status.draft': { en: 'Draft', ru: 'Черновик', kg: 'Долбоор' },
  'status.pending': { en: 'Pending', ru: 'В ожидании', kg: 'Күтүлүүдө' },
  'status.signed': { en: 'Signed', ru: 'Подписан', kg: 'Кол коюлган' },
  'status.rejected': { en: 'Rejected', ru: 'Отклонен', kg: 'Жетпеген' },
  
  // Table
  'table.title': { en: 'Title', ru: 'Название', kg: 'Аталышы' },
  'table.status': { en: 'Status', ru: 'Статус', kg: 'Статус' },
  'table.uploaded': { en: 'Uploaded', ru: 'Загружен', kg: 'Жүктөлгөн' },
  'table.actions': { en: 'Actions', ru: 'Действия', kg: 'Аракеттер' },

  // Upload Page (minimal)
  'upload.title': { en: 'Upload Document', ru: 'Загрузить документ', kg: 'Документ жүктөө' },
  'upload.desc': { en: 'Select a PDF to upload', ru: 'Выберите PDF для загрузки', kg: 'Жүктөө үчүн PDF тандаңыз' },
  
  // Sign Modal
  'sign.title': { en: 'Sign Target Document', ru: 'Подписать документ', kg: 'Документке кол коюу' },
  'sign.prev': { en: 'Prev', ru: 'Пред', kg: 'Артка' },
  'sign.next': { en: 'Next', ru: 'След', kg: 'Алга' },
  'sign.page': { en: 'Page {current} of {total}', ru: 'Страница {current} из {total}', kg: 'Барак {current} / {total}' },
  'sign.discard': { en: 'Discard Changes', ru: 'Отменить изменения', kg: 'Өзгөрүүлөрдү жокко чыгаруу' },
  'sign.working': { en: 'Working...', ru: 'Обработка...', kg: 'Иштелүүдө...' },
  'sign.stamp': { en: 'Stamp {count} Elements', ru: 'Поставить {count} элементов', kg: '{count} элементти коюу' },
  'sign.clear': { en: 'Clear Field', ru: 'Очистить поле', kg: 'Талааны тазалоо' },
  
  // Sign Modal Tabs
  'tab.draw': { en: 'Draw', ru: 'Рисовать', kg: 'Тартуу' },
  'tab.upload': { en: 'Upload', ru: 'Загрузить', kg: 'Жүктөө' },
  'tab.text': { en: 'Text', ru: 'Текст', kg: 'Текст' },
  'tab.tools': { en: 'Quick Tools', ru: 'Инструменты', kg: 'Куралдар' },
  'tab.vault': { en: 'Vault', ru: 'Хранилище', kg: 'Сактагыч' },
  'tab.extract': { en: 'PDF Extractor', ru: 'PDF Экстрактор', kg: 'PDF Чыгаруу' }
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved && ['en', 'ru', 'kg'].includes(saved)) {
      setLangState(saved);
    } else {
      setLangState('ru'); // RU default target
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string, variables?: Record<string, string | number>): string => {
    if (!mounted) return key; // return key to avoid hydration mismatch, or default english
    const translationSet = translations[key];
    let result = translationSet ? translationSet[lang] || translationSet['en'] : key;
    
    if (variables) {
      Object.keys(variables).forEach(varKey => {
        result = result.replace(`{${varKey}}`, String(variables[varKey]));
      });
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
         <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value as Language)}
          style={{
            appearance: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-text-main)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '0.5rem 2.2rem 0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            width: '100px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <option value="en" style={{color: 'black', background: 'white'}}>🇺🇸 EN</option>
          <option value="ru" style={{color: 'black', background: 'white'}}>🇷🇺 RU</option>
          <option value="kg" style={{color: 'black', background: 'white'}}>🇰🇬 KG</option>
        </select>
        <div style={{ pointerEvents: 'none', position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
}
