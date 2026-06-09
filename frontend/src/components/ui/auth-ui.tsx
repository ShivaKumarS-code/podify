"use client";

import * as React from "react";
import { useState, useId } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Typewriter } from "@/components/ui/typewriter";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const labelVariants = cva(
  "text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-mono uppercase tracking-wide text-neutral-300"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase font-mono tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-white/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-white/20 bg-transparent text-white hover:bg-white hover:text-black hover:border-white",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-white underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-md px-4",
        lg: "h-14 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border-2 border-white/10 bg-black/40 px-4 py-3 text-base text-white shadow-sm transition-all placeholder:text-neutral-600 focus-visible:border-white/10 focus-visible:outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 font-mono",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);
    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <Input id={id} type={showPassword ? "text" : "password"} className={cn("pe-12", className)} ref={ref} {...props} />
          <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 end-0 flex h-full w-12 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? (<EyeOff className="size-5" aria-hidden="true" />) : (<Eye className="size-5" aria-hidden="true" />)}
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

function SignInForm({ onError }: { onError: (msg: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });
      if (res?.error) {
        onError(res.error.message || "Invalid credentials. Please try again.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      onError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl uppercase font-mono text-white leading-none">Sign in to your account</h1>
        <p className="text-balance text-xs text-neutral-500 font-mono uppercase tracking-wider">Enter your credentials below to log in</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <PasswordInput name="password" label="Password" required autoComplete="current-password" placeholder="••••••••" />
        </div>
        <Button type="submit" variant="outline" className="mt-2 h-12 text-base" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </Button>
      </div>
    </form>
  );
}

function SignUpForm({ onError }: { onError: (msg: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/dashboard",
      });
      if (res?.error) {
        onError(res.error.message || "Failed to create account. Please try again.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      onError(err.message || "Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl uppercase font-mono text-white leading-none">Create an account</h1>
        <p className="text-balance text-xs text-neutral-500 font-mono uppercase tracking-wider">Enter your details below to sign up</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" type="text" placeholder="John Doe" required autoComplete="name" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <PasswordInput name="password" label="Password" required autoComplete="new-password" placeholder="••••••••"/>
        </div>
        <Button type="submit" variant="outline" className="mt-2 h-12 text-base" disabled={loading}>
          {loading ? "Creating Account..." : "Sign Up"}
        </Button>
      </div>
    </form>
  );
}

function AuthFormContainer({ isSignIn, onToggle }: { isSignIn: boolean; onToggle: () => void; }) {
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Google Authentication failed.");
    }
  };

  return (
    <div className="mx-auto grid w-[400px] max-w-full gap-5 px-4">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-center font-mono uppercase">
          {errorMsg}
        </div>
      )}
      
      {isSignIn ? (
        <SignInForm onError={setErrorMsg} />
      ) : (
        <SignUpForm onError={setErrorMsg} />
      )}

      <div className="text-center text-sm font-mono uppercase text-neutral-400">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Button variant="link" className="pl-1 text-white font-mono uppercase text-sm h-auto p-0" onClick={onToggle}>
          {isSignIn ? "Sign up" : "Sign in"}
        </Button>
      </div>
      <div className="relative text-center text-xs font-mono uppercase text-neutral-500 after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-white/10">
        <span className="relative z-10 bg-black px-3 text-neutral-500 tracking-wider">Or continue with</span>
      </div>
      <Button variant="outline" type="button" onClick={handleGoogleSignIn} className="font-mono uppercase text-base h-12">
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google icon" className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
    </div>
  );
}

interface AuthContentProps {
  image?: {
    src: string;
    alt: string;
  };
  quote?: {
    text: string;
    author: string;
  }
}

interface AuthUIProps {
  signInContent?: AuthContentProps;
  signUpContent?: AuthContentProps;
}

const defaultSignInContent = {
  image: {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1000&fit=crop",
    alt: "A beautiful abstract design for sign-in"
  },
  quote: {
    text: "Welcome Back! The journey continues.",
    author: "Podify"
  }
};

const defaultSignUpContent = {
  image: {
    src: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&h=1000&fit=crop",
    alt: "A vibrant, modern space for new beginnings"
  },
  quote: {
    text: "Create an account. A new chapter awaits.",
    author: "Podify"
  }
};

export function AuthUI({ signInContent = {}, signUpContent = {} }: AuthUIProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const toggleForm = () => setIsSignIn((prev) => !prev);

  const finalSignInContent = {
    image: { ...defaultSignInContent.image, ...signInContent.image },
    quote: { ...defaultSignInContent.quote, ...signInContent.quote },
  };
  const finalSignUpContent = {
    image: { ...defaultSignUpContent.image, ...signUpContent.image },
    quote: { ...defaultSignUpContent.quote, ...signUpContent.quote },
  };

  const currentContent = isSignIn ? finalSignInContent : finalSignUpContent;

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-black">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
      <div className="flex h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-8 bg-black">
        <AuthFormContainer isSignIn={isSignIn} onToggle={toggleForm} />
      </div>

      <div className="hidden md:block relative overflow-hidden border-l border-white/10 h-full w-full bg-black">
        <video
          key={isSignIn ? "sign-in" : "sign-up"}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          src={isSignIn ? "/sign-in.mp4" : "/sign-up.mp4"}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-black to-transparent z-10" />
        
        <div className="relative z-20 flex h-full flex-col items-center justify-end p-6 pb-12">
          <blockquote className="space-y-3 text-center text-white font-mono uppercase tracking-wider bg-black/60 backdrop-blur-sm p-6 rounded-xl border border-white/5 max-w-lg">
            <p className="text-xl font-bold leading-normal">
              “<Typewriter
                  key={currentContent.quote.text}
                  text={currentContent.quote.text}
                  speed={60}
                />”
            </p>
            <cite className="block text-xs font-semibold text-neutral-400 not-italic tracking-widest">
              — {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
