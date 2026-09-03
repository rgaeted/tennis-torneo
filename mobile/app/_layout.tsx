import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SessionProvider, useSession } from "../src/auth/session";
import { isStaffRol } from "../../lib/auth/staffAccess";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, accessToken, rol } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!accessToken || !isStaffRol(rol)) {
      if (!onLogin) router.replace("/login");
    } else if (onLogin) {
      router.replace("/torneos");
    }
  }, [loading, accessToken, rol, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" }}>
        <ActivityIndicator color="#c8ff00" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AuthGate>
        <Stack screenOptions={{ headerStyle: { backgroundColor: "#111" }, headerTintColor: "#fff" }} />
      </AuthGate>
    </SessionProvider>
  );
}
