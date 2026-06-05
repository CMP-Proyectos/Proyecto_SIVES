import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // eliminar encabezado azul
        animation: 'fade',  // transición suave
        contentStyle: { backgroundColor: '#F5F7FB' } // fondo gris claro base
      }} 
    />
  );
}
