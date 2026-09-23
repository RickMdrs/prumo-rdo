import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const CHAVE = 'prumo:biometria-ativa';

/**
 * A trava biométrica é um conforto, nunca uma barreira: se o aparelho não
 * tiver sensor, não tiver digital cadastrada, ou o Expo Go recusar o pedido,
 * o app segue pedindo a senha em vez de travar o usuário do lado de fora.
 */
export async function biometriaDisponivel(): Promise<boolean> {
  try {
    const temSensor = await LocalAuthentication.hasHardwareAsync();
    if (!temSensor) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function biometriaAtiva(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHAVE)) === 'sim';
  } catch {
    return false;
  }
}

export async function definirBiometriaAtiva(ativa: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE, ativa ? 'sim' : 'nao');
  } catch {
    // Preferência de conforto: se o armazenamento falhar, seguir sem ela.
  }
}

export async function autenticarPorBiometria(): Promise<boolean> {
  try {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear o Prumo RDO',
      cancelLabel: 'Usar senha',
      disableDeviceFallback: false,
    });
    return resultado.success;
  } catch {
    return false;
  }
}
