import React from "react";
import {
  AppSettings,
  AppTheme,
  ArabicFont,
  TranslationSource,
} from "../types/quran";
import { X, Sun, Coffee } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-stone-100">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
            Okuma & Görünüm Ayarları
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 1. Theme Selection */}
        <div>
          <label className="block text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 sm:mb-2.5">
            Tema Modu
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {[
              { id: "light", name: "Açık", icon: Sun },
              { id: "sepia", name: "Kitap (Sepya)", icon: Coffee },
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onUpdateSettings({ theme: id as AppTheme })}
                className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border text-[10px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                  settings.theme === id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold shadow-sm"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Arabic Font Family */}
        <div>
          <label className="block text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 sm:mb-2.5">
            Arapça Hat / Yazı Tipi
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {[
              {
                id: "amiri",
                name: "Amiri (Klasik Hat)",
                sample: "بِسْمِ ٱللَّهِ",
              },
              {
                id: "scheherazade",
                name: "Şehrizad (Osmanlı)",
                sample: "بِسْمِ ٱللَّهِ",
              },
            ].map(({ id, name, sample }) => (
              <button
                key={id}
                onClick={() =>
                  onUpdateSettings({ arabicFont: id as ArabicFont })
                }
                className={`p-2 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  settings.arabicFont === id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span className="text-[10px] sm:text-xs font-medium">
                  {name}
                </span>
                <span
                  dir="rtl"
                  className={`text-lg sm:text-xl font-bold mt-1 sm:mt-2 ${
                    id === "scheherazade" ? "font-scheherazade" : "font-arabic"
                  }`}
                >
                  {sample}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Font Size Multiplier */}
        <div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 sm:mb-2">
            <span>Arapça Yazı Boyutu</span>
            <span className="font-mono text-emerald-600 font-bold">
              %{Math.round(settings.fontSizeMultiplier * 100)}
            </span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.8"
            step="0.1"
            value={settings.fontSizeMultiplier}
            onChange={(e) =>
              onUpdateSettings({
                fontSizeMultiplier: parseFloat(e.target.value),
              })
            }
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* 4. Word Meaning Display Toggle */}
        <div className="pt-2 border-t border-stone-100 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-stone-900 block">
                Kelimelerin Altında Sürekli Mana Göster
              </span>
              <span className="text-[9px] sm:text-[11px] text-stone-500 block">
                Kapalı olduğunda sadece fareyle üzerine gelince (hover) veya
                dokununca çıkar.
              </span>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({
                  alwaysShowWordMeaning: !settings.alwaysShowWordMeaning,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                settings.alwaysShowWordMeaning
                  ? "bg-emerald-600"
                  : "bg-stone-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.alwaysShowWordMeaning
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* 5. Translation Source Selection */}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 sm:mb-2">
              Âyet Meali Kaynağı
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[
                { id: 77, name: "Diyanet" },
                { id: 52, name: "Elmalılı" },
                { id: "both", name: "Her İkisi" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    onUpdateSettings({
                      translationSource: opt.id as TranslationSource,
                    })
                  }
                  className={`py-1.5 sm:py-2 px-1.5 sm:px-2 text-[10px] sm:text-xs rounded-xl border font-medium text-center transition-all ${
                    settings.translationSource === opt.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-stone-200 text-stone-600"
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] sm:text-xs font-semibold shadow-md transition-colors"
        >
          Kaydet ve Kapat
        </button>
      </div>
    </div>
  );
};
