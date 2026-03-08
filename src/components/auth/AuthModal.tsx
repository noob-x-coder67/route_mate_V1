import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { departments } from "@/data/mockData";
import {
  Leaf,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.api";

// Password Security: 8+ chars, 1 Upper, 1 Lower, 1 Number, 1 Special
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const signInSchema = z.object({
  email: z.string().email("Enter your university email"),
  password: z.string().min(1, "Password required"),
  rememberMe: z.boolean().optional(),
});

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid university email"),
    password: z.string().regex(passwordRegex, "Password too weak"),
    confirmPassword: z.string(),
    gender: z.enum(["MALE", "FEMALE"], { required_error: "Select gender" }),
    department: z.string().min(1, "Select department"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "signin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestUniName, setRequestUniName] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      department: "",
    },
  });

  // LOGIC: Detect University from real DB
  const [universities, setUniversities] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/auth/universities`)
      .then((r) => r.json())
      .then((d) => setUniversities(d.data?.universities || []))
      .catch(() => {});
  }, []);

  const emailValue = signUpForm.watch("email");
  const detectedUni = useMemo(() => {
    if (!emailValue || !emailValue.includes("@")) return null;
    const domain = emailValue.split("@")[1];
    return universities.find((u: any) => u.emailDomain === domain);
  }, [emailValue, universities]);

  // LOGIC: Password Requirement Checklist
  const pwd = signUpForm.watch("password") || "";
  const checks = [
    { label: "8+ Characters", met: pwd.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(pwd) },
    { label: "Lowercase", met: /[a-z]/.test(pwd) },
    { label: "Number", met: /\d/.test(pwd) },
    { label: "Special (@$!%*&)", met: /[@$!%*?&]/.test(pwd) },
  ];

  const handleSignIn = async (data: SignInValues) => {
    setIsLoading(true);
    try {
      const success = await login({
        email: data.email,
        password: data.password,
        rememberMe: !!data.rememberMe,
      });

      if (success) {
        toast({
          title: "Welcome Back!",
          description: "You have successfully signed in.",
        });
        onOpenChange(false);
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Check your credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpValues) => {
    setIsLoading(true);
    try {
      const success = await register({
        name: data.name,
        email: data.email,
        password: data.password,
        gender: data.gender,
        department: data.department,
      });

      if (success) {
        toast({
          title: "Account Created!",
          description: "Welcome to the RouteMate community.",
        });
        onOpenChange(false);
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Registration Error",
        description: err.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUniRequest = async () => {
    setIsLoading(true);
    try {
      const success = await authService.requestUniversity({
        email: emailValue,
        universityName: requestUniName,
      });

      if (success) {
        toast({
          title: "Request Sent!",
          description: "We'll verify your university and notify you soon.",
        });
        setShowRequestForm(false);
        setRequestUniName("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto bg-background">
        <DialogHeader className="items-center">
          <div className="p-3 bg-primary/10 rounded-full mb-2">
            <Leaf className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            RouteMate
          </DialogTitle>
          <DialogDescription>
            Pakistan's Student Carpooling Network
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <form
              onSubmit={signInForm.handleSubmit(handleSignIn)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="si-email">University Email</Label>
                <Input
                  id="si-email"
                  placeholder="student@nutech.edu.pk"
                  {...signInForm.register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-password">Password</Label>
                <div className="relative">
                  <Input
                    id="si-password"
                    type={showPassword ? "text" : "password"}
                    {...signInForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 pt-2">
            <form
              onSubmit={signUpForm.handleSubmit(handleSignUp)}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  placeholder="Ahmed Ali"
                  {...signUpForm.register("name")}
                />
              </div>

              <div className="space-y-1">
                <Label>University Email</Label>
                <Input
                  placeholder="name@nutech.edu.pk"
                  {...signUpForm.register("email")}
                />

                {detectedUni ? (
                  <div className="flex items-center mt-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
                    <Building2 className="h-4 w-4 text-primary mr-2" />
                    <span className="text-xs font-medium text-primary uppercase">
                      Registering for: {detectedUni.name}
                    </span>
                  </div>
                ) : (
                  emailValue?.includes("@") && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-[11px] text-amber-700 font-medium">
                        Your university isn't on RouteMate yet.
                      </p>
                      {!showRequestForm ? (
                        <button
                          type="button"
                          onClick={() => setShowRequestForm(true)}
                          className="text-[11px] text-primary underline font-bold mt-1"
                        >
                          Click here to request adding it
                        </button>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <Input
                            placeholder="Enter University Full Name"
                            className="h-8 text-xs bg-white"
                            value={requestUniName}
                            onChange={(e) => setRequestUniName(e.target.value)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 w-full text-[10px]"
                            onClick={handleUniRequest}
                            disabled={!requestUniName || isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="animate-spin h-3 w-3" />
                            ) : (
                              "Submit Request"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <Select
                    onValueChange={(v) =>
                      signUpForm.setValue("gender", v as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select
                    onValueChange={(v) => signUpForm.setValue("department", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    {...signUpForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t mt-2">
                  {checks.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center text-[10px] ${c.met ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {c.met ? (
                        <CheckCircle2 size={12} className="mr-1" />
                      ) : (
                        <Circle size={12} className="mr-1" />
                      )}
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pb-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  {...signUpForm.register("confirmPassword")}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !passwordRegex.test(pwd)}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
