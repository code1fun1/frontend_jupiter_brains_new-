import { useEffect, useState } from 'react';
import { Trash2, GripVertical, Settings2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AIModel } from '@/types/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getBackendBaseUrl, API_ENDPOINTS } from '@/utils/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
        const configUrl = API_ENDPOINTS.openai.config();

        const res = await fetch(configUrl, {
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
      const updateConfigUrl = API_ENDPOINTS.openai.updateConfig();

      const res = await fetch(updateConfigUrl, {
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

  const handleModelToggle = async (model: AIModel, enabled: boolean) => {
    // Optimistically update UI
    onUpdateModel(model.id, { enabled });

    // If enabling, persist to backend
    if (enabled && model.rawData) {
      try {
        const createUrl = API_ENDPOINTS.models.create();
        const rawData = model.rawData;

        // Construct payload matching the backend structure
        const payload = {
          id: rawData.id || model.id,
          name: rawData.name || model.name,
          base_model_id: rawData.base_model_id || null,
          params: rawData.params || {},
          meta: {
            profile_image_url: rawData.meta?.profile_image_url || rawData.profile_image_url || '/static/favicon.png',
            description: rawData.meta?.description || rawData.description || null,
            capabilities: rawData.meta?.capabilities || rawData.capabilities || {
              file_context: true,
              vision: true,
              file_upload: true,
              web_search: true,
              image_generation: true,
              code_interpreter: true,
              citations: true,
              status_updates: true,
              builtin_tools: true,
            },
            suggestion_prompts: rawData.meta?.suggestion_prompts || rawData.suggestion_prompts || null,
            tags: rawData.meta?.tags || rawData.tags || [],
          },
          access_control: rawData.access_control || null,
          is_active: true,
          active: true,
          connection_type: rawData.connection_type || 'external',
          context_window: rawData.context_window || 4096,
          max_completion_tokens: rawData.max_completion_tokens || 4096,
          created: rawData.created || Math.floor(Date.now() / 1000),
          object: rawData.object || 'model',
          owned_by: rawData.owned_by || rawData.openai?.owned_by || 'openai',
          public_apps: rawData.public_apps || null,
          urlIdx: rawData.urlIdx || 1,
          openai: rawData.openai || {
            id: rawData.id || model.id,
            object: 'model',
            created: rawData.created || Math.floor(Date.now() / 1000),
            owned_by: rawData.owned_by || 'openai',
            active: true,
            connection_type: rawData.connection_type || 'external',
            context_window: rawData.context_window || 4096,
            max_completion_tokens: rawData.max_completion_tokens || 4096,
          },
        };

        const res = await fetch(createUrl, {
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
          const message = data?.detail || data?.message || `Failed to save model (HTTP ${res.status})`;
          toast.error(message);
          // Revert on error
          onUpdateModel(model.id, { enabled: false });
          return;
        }

        toast.success(`Model "${model.name}" saved to database`);

        // Fetch updated base models list
        try {
          const baseUrl = API_ENDPOINTS.models.base();
          const baseRes = await fetch(baseUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...getStoredAuthHeader(),
            },
            credentials: 'include',
          });

          if (baseRes.ok) {
            const baseModels = await baseRes.json();
            console.log('Updated base models:', baseModels);
            // Optionally refresh the models list
            if (onRefreshModels) {
              await onRefreshModels();
            }
          }
        } catch (err) {
          console.error('Failed to fetch base models:', err);
          // Don't show error to user as the model was saved successfully
        }
      } catch (err: any) {
        console.error('Model creation error:', err);
        toast.error(err?.message || 'Failed to save model');
        // Revert on error - keep the toggle OFF
        onUpdateModel(model.id, { enabled: false });
      }
    } else if (!enabled) {
      // When disabling, just update UI state (don't delete from backend)
      toast.info(`Model "${model.name}" disabled locally`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Models</h2>
          <p className="text-zinc-400 text-sm">Manage the intelligence of your assistant</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-zinc-200 transition-all font-semibold gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Settings2 className="h-4 w-4" />
              Connect OpenAI
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-white/10 text-white backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                OpenAI Configuration
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Update connection settings for OpenAI-compatible backends
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {openAIOverview && (
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Current Setup</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={applyOverviewToForm}
                      className="text-xs h-7 hover:bg-white/5 hover:text-white"
                    >
                      Reset to Saved
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-zinc-500">API Status</div>
                      <div className="font-mono text-zinc-300 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${openAIOverview?.ENABLE_OPENAI_API ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {openAIOverview?.ENABLE_OPENAI_API ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-500">Endpoints</div>
                      <div className="font-mono text-zinc-300 truncate">
                        {Array.isArray(openAIOverview?.OPENAI_API_BASE_URLS)
                          ? openAIOverview.OPENAI_API_BASE_URLS[0] || 'N/A'
                          : 'N/A'}
                        {Array.isArray(openAIOverview?.OPENAI_API_BASE_URLS) && openAIOverview.OPENAI_API_BASE_URLS.length > 1 && ` (+${openAIOverview.OPENAI_API_BASE_URLS.length - 1} more)`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">Enabled Gateway</div>
                  <div className="text-xs text-zinc-500">Allow AI traffic through this provider</div>
                </div>
                <Switch checked={enableOpenAI} onCheckedChange={setEnableOpenAI} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-base-urls" className="text-zinc-400 text-xs uppercase tracking-wider ml-1">Base URLs</Label>
                <Textarea
                  id="openai-base-urls"
                  placeholder="https://api.openai.com/v1"
                  value={openAIBaseUrlsText}
                  onChange={(e) => setOpenAIBaseUrlsText(e.target.value)}
                  className="bg-black/50 border-white/5 focus:border-purple-500/50 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-keys" className="text-zinc-400 text-xs uppercase tracking-wider ml-1">API Keys</Label>
                <Textarea
                  id="openai-keys"
                  placeholder="sk-..."
                  value={openAIKeysText}
                  onChange={(e) => setOpenAIKeysText(e.target.value)}
                  className="bg-black/50 border-white/5 focus:border-purple-500/50 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-configs" className="text-zinc-400 text-xs uppercase tracking-wider ml-1">Advanced Config (JSON)</Label>
                <Textarea
                  id="openai-configs"
                  placeholder='{}'
                  value={openAIConfigsJson}
                  onChange={(e) => setOpenAIConfigsJson(e.target.value)}
                  className="bg-black/50 border-white/5 focus:border-purple-500/50 min-h-[120px] font-mono text-xs"
                />
              </div>

              <Button
                onClick={handleSaveOpenAIConfig}
                disabled={isSavingOpenAIConfig}
                className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-11 shadow-[0_4px_15px_rgba(255,255,255,0.1)] transition-all"
              >
                {isSavingOpenAIConfig ? 'Synchronizing...' : 'Update Configuration'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white">Available Models</CardTitle>
          <CardDescription className="text-zinc-400">Configure visible intelligence options for users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-6 pb-6">
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
                  handleModelToggle(model, enabled)
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

      <div className="text-[10px] text-zinc-600 bg-white/5 p-4 rounded-xl border border-white/5 uppercase tracking-[0.2em] text-center">
        Secure Model Management &bull; Enterprise Protocol v2.1
      </div>
    </div>
  );
}
