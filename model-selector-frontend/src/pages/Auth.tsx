import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import jupiterBrainsLogo from '@/assets/jupiter-brains-logo.png';
import { Github, Mail } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  });

  useEffect(() => {
    if (isLoading || !user) return;
    if (!isRedirecting) setIsRedirecting(true);
  }, [user, isLoading, isRedirecting]);

  useEffect(() => {
    if (isLoading || !user || !isRedirecting) return;

    const t = window.setTimeout(() => {
      navigate('/');
    }, 600);

    return () => window.clearTimeout(t);
  }, [user, isLoading, navigate, isRedirecting]);

  const handleSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = isLogin
        ? await signIn(data.email, data.password)
        : await signUp(data.email, data.password, data.name);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(isLogin ? 'Logged in successfully!' : 'Account created successfully!');
        setIsRedirecting(true);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
    }
  };

  const handleGithubSignIn = async () => {
    const { error } = await signInWithGithub();
    if (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={jupiterBrainsLogo} alt="JupiterBrains" className="w-16 h-16" />
            </div>
            <CardTitle className="text-2xl font-bold">JupiterBrains</CardTitle>
            <CardDescription className="text-muted-foreground">Redirecting...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-4">
              <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 dark overflow-hidden relative">
      {/* Premium Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative z-10 transition-all duration-500 hover:border-white/20">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner group transition-all duration-300 hover:scale-110">
              <img src={jupiterBrainsLogo} alt="JupiterBrains" className="w-14 h-14 object-contain" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            JupiterBrains
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            {isLogin ? 'Welcome back to your AI assistant' : 'Join the next generation of intelligence'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              {!isLogin && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs uppercase tracking-wider text-zinc-500 ml-1">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          className="bg-zinc-900/50 border-white/5 focus:border-purple-500/50 transition-all placeholder:text-zinc-600 h-11"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs uppercase tracking-wider text-zinc-500 ml-1">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        className="bg-zinc-900/50 border-white/5 focus:border-purple-500/50 transition-all placeholder:text-zinc-600 h-11"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs uppercase tracking-wider text-zinc-500 ml-1">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="bg-zinc-900/50 border-white/5 focus:border-purple-500/50 transition-all placeholder:text-zinc-600 h-11"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200 transition-all duration-300 font-semibold h-11 mt-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isLogin ? 'Verifying...' : 'Creating...'
                  : isLogin ? 'Login to Portal' : 'Create Account'}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-zinc-500 hover:text-white transition-all duration-300 relative group"
            >
              <span>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <span className="ml-1.5 font-medium text-white group-hover:underline underline-offset-4 decoration-purple-500/50">
                {isLogin ? 'Sign up' : 'Login'}
              </span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[10px] text-zinc-600 text-center leading-relaxed uppercase tracking-widest">
              Secured by Jupiter Protocol &bull; Edge Computing Enabled
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

