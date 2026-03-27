'use client';

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface CreditFieldConfigRowProps {
  label: string;
  fieldName: string;
  config: FieldConfig;
  onChange: (fieldName: string, property: 'enabled' | 'required', value: boolean) => void;
  disabled?: boolean;
}

export default function CreditFieldConfigRow({
  label,
  fieldName,
  config,
  onChange,
  disabled = false,
}: CreditFieldConfigRowProps) {
  return (
    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10 mb-3 hover:bg-white/10 transition-all duration-300">
      <label className="flex-1 font-semibold text-white text-sm sm:text-base">{label}</label>
      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange(fieldName, 'enabled', e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className={`text-sm ${config.enabled ? 'text-white' : 'text-[#CBD5E1]/50'}`}>
            Activé
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.required}
            disabled={!config.enabled || disabled}
            onChange={(e) => onChange(fieldName, 'required', e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1a1f3a] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className={`text-sm ${config.enabled ? (config.required ? 'text-white' : 'text-[#CBD5E1]') : 'text-[#CBD5E1]/30'}`}>
            Obligatoire
          </span>
        </label>
      </div>
    </div>
  );
}

