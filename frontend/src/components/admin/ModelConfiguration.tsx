import { useEffect, useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AIModel } from '@/types/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ModelConfigurationProps {
  models: AIModel[];
  onUpdateModel: (modelId: string, updates: Partial<AIModel>) => void;
  onRemoveModel: (modelId: string) => void;
  onRefreshModels?: () => Promise<void> | void;
}

export function ModelConfiguration({
  models,
  onUpdateModel,
  onRemoveModel,
  onRefreshModels,
}: ModelConfigurationProps) {
  const [openAIOverview, setOpenAIOverview] = useState<any | null>(null);
  const [enableOpenAI, setEnableOpenAI] = useState(true);
  const [openAIBaseUrlsText, setOpenAIBaseUrlsText] = useState('');
  const [openAIKeysText, setOpenAIKeysText] = useState('');
  const [openAIConfigsJson, setOpenAIConfigsJson] = useState('{\n  \n}');
  const [isSavingOpenAIConfig, setIsSavingOpenAIConfig] = useState(false);

  const getOverviewStorageKey = () => {
    try {
      const rawUser = localStorage.getItem('jb_static_auth');
      const parsed = rawUser ? (JSON.parse(rawUser) as any) : null;
      const email = typeof parsed?.email === 'string' ? parsed.email.trim().toLowerCase() : '';
      return email ? `jb_openai_config_overview:${email}` : 'jb_openai_config_overview';
    } catch {
      return 'jb_openai_config_overview';
    }
  };

  const readOverviewFromStorage = () => {
    try {
      const raw = localStorage.getItem(getOverviewStorageKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const saved = readOverviewFromStorage();
    if (saved) setOpenAIOverview(saved);
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => {
      setOpenAIOverview(readOverviewFromStorage());
    };

    window.addEventListener('jb-auth-changed', handleAuthChanged);
    window.addEventListener('storage', handleAuthChanged);

    return () => {
      window.removeEventListener('jb-auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleAuthChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${getBackendBaseUrl()}/openai/config`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...getStoredAuthHeader(),
          },
          credentials: 'include',
        });

        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data) return;

        const d: any = data as any;
        const overview = d?.data && typeof d.data === 'object' ? d.data : d;
        if (!overview || typeof overview !== 'object') return;

        setOpenAIOverview(overview);
        try {
          localStorage.setItem(getOverviewStorageKey(), JSON.stringify(overview));
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maskKey = (key: string) => {
    const k = String(key || '').trim();
    if (!k) return '';
    if (k.length <= 8) return `${k.slice(0, 2)}****${k.slice(-2)}`;
    return `${k.slice(0, 4)}****${k.slice(-4)}`;
  };

  const applyOverviewToForm = () => {
    const s: any = openAIOverview;
    if (!s) return;

    if (typeof s?.ENABLE_OPENAI_API === 'boolean') setEnableOpenAI(s.ENABLE_OPENAI_API);
    if (Array.isArray(s?.OPENAI_API_BASE_URLS)) setOpenAIBaseUrlsText(s.OPENAI_API_BASE_URLS.join('\n'));
    if (Array.isArray(s?.OPENAI_API_KEYS)) setOpenAIKeysText(s.OPENAI_API_KEYS.join('\n'));
    if (s?.OPENAI_API_CONFIGS && typeof s.OPENAI_API_CONFIGS === 'object') {
      setOpenAIConfigsJson(JSON.stringify(s.OPENAI_API_CONFIGS, null, 2));
    }

    toast.success('Loaded saved config into editor');
  };

  const getBackendBaseUrl = () => {
    const raw = (import.meta as any)?.env?.VITE_BACKEND_BASE_URL;
    const base = typeof raw === 'string' ? raw.replace(/"/g, '').trim() : '';
    return (base || 'http://localhost:8081').replace(/\/$/, '');
  };

  const getStoredAuthHeader = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem('jb_static_auth_session');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as any;
      const token = typeof parsed?.token === 'string' ? parsed.token : '';
      if (!token) return {};
      const tokenType = typeof parsed?.token_type === 'string' ? parsed.token_type : 'Bearer';
      return { Authorization: `${tokenType} ${token}`.trim() };
    } catch {
      return {};
    }
  };

  const parseList = (text: string): string[] => {
    return text
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSaveOpenAIConfig = async () => {
    let configs: any = {};
    try {
      const trimmed = openAIConfigsJson.trim();
      configs = trimmed ? JSON.parse(trimmed) : {};
    } catch {
      toast.error('OPENAI_API_CONFIGS must be valid JSON');
      return;
    }

    const payload = {
      ENABLE_OPENAI_API: enableOpenAI,
      OPENAI_API_BASE_URLS: parseList(openAIBaseUrlsText),
      OPENAI_API_KEYS: parseList(openAIKeysText),
      OPENAI_API_CONFIGS: configs && typeof configs === 'object' ? configs : {},
    };

    setIsSavingOpenAIConfig(true);
    try {
      const res = await fetch(`${getBackendBaseUrl()}/openai/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getStoredAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          typeof data?.detail === 'string'
            ? data.detail
            : typeof data?.message === 'string'
              ? data.message
              : `Failed to update OpenAI config (HTTP ${res.status})`;
        toast.error(message);
        return;
      }

      try {
        localStorage.setItem(getOverviewStorageKey(), JSON.stringify(payload));
      } catch {
        // ignore persistence failures
      }

      setOpenAIOverview(payload);

      toast.success('OpenAI config updated successfully');

      if (onRefreshModels) {
        try {
          await onRefreshModels();
        } catch {
          // ignore refresh errors
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update OpenAI config');
    } finally {
      setIsSavingOpenAIConfig(false);
    }
  };

  const defaultModelIds = ['jupiterbrains', 'chatgpt', 'claude', 'gemini', 'random'];

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Available Models</CardTitle>
          <CardDescription>Configure which models are available to users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{model.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {model.description}
                </div>
              </div>
              <Switch
                checked={model.enabled}
                onCheckedChange={(enabled) =>
                  onUpdateModel(model.id, { enabled })
                }
              />
              {!defaultModelIds.includes(model.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveModel(model.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">OpenAI Configuration</CardTitle>
          <CardDescription>
            Update OpenAI backend settings via <span className="font-mono">/openai/config/update</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {openAIOverview && (
            <div className="rounded-lg border border-border bg-accent/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">Saved Overview</div>
                <Button variant="outline" size="sm" onClick={applyOverviewToForm}>
                  Edit saved config
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">ENABLE_OPENAI_API</div>
                  <div className="font-mono">{String(!!openAIOverview?.ENABLE_OPENAI_API)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">OPENAI_API_BASE_URLS</div>
                  <div className="font-mono break-words">
                    {Array.isArray(openAIOverview?.OPENAI_API_BASE_URLS)
                      ? openAIOverview.OPENAI_API_BASE_URLS.join(', ')
                      : ''}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground">OPENAI_API_KEYS</div>
                  <div className="font-mono break-words">
                    {Array.isArray(openAIOverview?.OPENAI_API_KEYS)
                      ? openAIOverview.OPENAI_API_KEYS.map((k: string) => maskKey(k)).join(', ')
                      : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 p-3 bg-accent/30 rounded-lg">
            <div>
              <div className="font-medium">ENABLE_OPENAI_API</div>
              <div className="text-xs text-muted-foreground">Turn OpenAI integration on/off</div>
            </div>
            <Switch checked={enableOpenAI} onCheckedChange={setEnableOpenAI} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-base-urls">OPENAI_API_BASE_URLS</Label>
            <Textarea
              id="openai-base-urls"
              placeholder="One URL per line (or comma-separated)"
              value={openAIBaseUrlsText}
              onChange={(e) => setOpenAIBaseUrlsText(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-keys">OPENAI_API_KEYS</Label>
            <Textarea
              id="openai-keys"
              placeholder="One key per line (or comma-separated)"
              value={openAIKeysText}
              onChange={(e) => setOpenAIKeysText(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-configs">OPENAI_API_CONFIGS (JSON)</Label>
            <Textarea
              id="openai-configs"
              placeholder='{\n  "additionalProp1": {}\n}'
              value={openAIConfigsJson}
              onChange={(e) => setOpenAIConfigsJson(e.target.value)}
              className="bg-background font-mono"
            />
          </div>

          <Button onClick={handleSaveOpenAIConfig} disabled={isSavingOpenAIConfig} className="w-full">
            {isSavingOpenAIConfig ? 'Saving...' : 'Save OpenAI Config'}
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg">
        <p>
          <strong>Note:</strong> To persist these settings and enable real AI
          functionality, please connect to a backend service.
        </p>
      </div>
    </div>
  );
}
