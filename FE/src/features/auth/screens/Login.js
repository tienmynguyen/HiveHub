// screens/Login.js
import React, { useState, useContext } from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import Background from '../../../components/common/Background';
import Logo from '../../../components/common/Logo';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import TextInput from '../../../components/common/TextInput';
import { theme } from '../../../theme/theme';
import { AuthContext } from '../context/AuthContext';
import {emailValidator, passwordValidator} from "../utils/validators";
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
import { hashPassword } from '../utils/hashPassword';

export default function LoginScreen({ navigation }) {
    const { applySession } = useContext(AuthContext);
    const [email, setEmail] = useState({ value: '', error: '' });
    const [password, setPassword] = useState({ value: '', error: '' });

    const onLoginPressed = () => {

        const emailError = emailValidator(email.value);
        const passwordError = passwordValidator(password.value);

        if (emailError || passwordError) {

            setEmail({ ...email, error: emailError });
            setPassword({ ...password, error: passwordError });
            return;
        }
        login();
    };

    async function login() {
        try {
            const hashedPassword = hashPassword(password.value);
            const { data: responseData } = await axios.post(endpoints.auth.login(), {
                email: email.value,
                password: hashedPassword,
            });
            await applySession(responseData);
            if (Platform.OS !== 'web') {
                navigation.navigate("MainTabs");
            }
        } catch (error) {
            const apiError = error?.response?.data;
            const message = apiError?.message || apiError?.code || 'Login failed';
            alert(message);
        }
    }

    return (
        <Background>
            <Logo />
            <Header>Welcome back.</Header>
            <TextInput
                label="Email"
                returnKeyType="next"
                value={email.value}
                onChangeText={(text) => setEmail({ value: text, error: '' })}
                error={!!email.error}
                errorText={email.error}
                autoCapitalize="none"
                autoCompleteType="email"
                textContentType="emailAddress"
                keyboardType="email-address"
            />
            <TextInput
                label="Password"
                returnKeyType="done"
                value={password.value}
                onChangeText={(text) => setPassword({ value: text, error: '' })}
                error={!!password.error}
                errorText={password.error}
                secureTextEntry
            />
            <View style={styles.forgotPassword}>
                <TouchableOpacity onPress={() => navigation.navigate('ResetPasswordScreen')}>
                    <Text style={styles.forgot}>Forgot your password?</Text>
                </TouchableOpacity>
            </View>
            <Button style={styles.loginbtn} mode="contained" onPress={onLoginPressed}>
                Login
            </Button>
            <View style={styles.row}>
                <Text>Don’t have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.link}>Sign up</Text>
                </TouchableOpacity>
            </View>
        </Background>
    );
}

const styles = StyleSheet.create({
    forgotPassword: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        marginTop: 4,
    },
    forgot: {
        fontSize: 13,
        color: theme.colors.secondary,
    },
    link: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    loginbtn:{
        backgroundColor: "#ffc808",
    }
});
