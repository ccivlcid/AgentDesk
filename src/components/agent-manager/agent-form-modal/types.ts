import type { Department } from "../../../types";
import type { FormData } from "../types";

export interface ApiProviderOption {
  id: string;
  name: string;
  type: string;
  base_url: string;
  models_cache: string[];
}

export interface AgentFormModalProps {
  isKo: boolean;
  locale: string;
  tr: (ko: string, en: string) => string;
  form: FormData;
  setForm: (f: FormData) => void;
  departments: Department[];
  isEdit: boolean;
  saving: boolean;
  saveError?: string | null;
  onSave: () => void;
  onClose: () => void;
  /** true이면 Modal 대신 독립 AppWindow로 렌더 */
  asWindow?: boolean;
}
