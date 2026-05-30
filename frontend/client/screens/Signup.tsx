
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import your logo
const Logo = require("../assets/images/ConvoInsight.png");

export default function SignupScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleContinue = async () => {
    if (!name || !phone) {
      alert("Please enter name and phone number");
      return;
    }
    // Save name and phone so ProfileScreen can read it
    await AsyncStorage.setItem("@ConvoInsight_userName", name);
    await AsyncStorage.setItem("@ConvoInsight_userPhone", phone);
    navigation.replace("Home");
  };

  return (
    <View style={styles.container}>
      {/* Logo at the top */}
      <View style={styles.logoContainer}>
        <Image source={Logo} style={styles.logo} />
      </View>

      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Enter your details to continue</Text>

      <TextInput
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#888"
      />

      <TextInput
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
        placeholderTextColor="#888"
      />

      <Pressable
        onPress={handleContinue}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f0f4f7",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#128C7E",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  button: {
    backgroundColor: "#25D366",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
});