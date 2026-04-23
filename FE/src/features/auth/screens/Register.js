import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import Background from '../../../components/common/Background';
import Logo from '../../../components/common/Logo';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import TextInput from '../../../components/common/TextInput';
import BackButton from '../../../components/common/BackButton';
import { theme } from '../../../theme/theme';
import { emailValidator, passwordValidator, nameValidator } from '../utils/validators';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
import { hashPassword } from '../utils/hashPassword';

export default function RegisterScreen({ navigation }) {
    const [name, setName] = useState({ value: '', error: '' });
    const [email, setEmail] = useState({ value: '', error: '' });
    const [password, setPassword] = useState({ value: '', error: '' });

    const onSignUpPressed = () => {
        const nameError = nameValidator(name.value);
        const emailError = emailValidator(email.value);
        const passwordError = passwordValidator(password.value);

        if (nameError || emailError || passwordError) {
            setName({ ...name, error: nameError });
            setEmail({ ...email, error: emailError });
            setPassword({ ...password, error: passwordError });
            return;
        }

        const hashedPassword = hashPassword(password.value);
        axios.post(endpoints.auth.register(), {
                email: email.value,
                password: hashedPassword,
                userName: name.value
            })
            .then(({ data: responseData }) => {
                if (responseData.email === email.value) {

                    alert( 'Registration sussces');
                    navigation.navigate('Login');
                } else {
                    alert(responseData.message || 'Registration failed');
                }
            })
            .catch((error) => {
                const apiError = error?.response?.data;
                const fallbackMessage = error?.message === 'Network Error'
                    ? 'Cannot reach backend. Please check URLAPI and backend server.'
                    : 'Something went wrong. Please try again.';
                alert(apiError?.message || apiError?.code || fallbackMessage);
            });
    };

    return (
        <Background>
            <BackButton goBack={navigation.goBack} />
            <Logo />
            <Header>Create Account</Header>
            <TextInput
                label="Name"
                returnKeyType="next"
                value={name.value}
                onChangeText={(text) => setName({ value: text, error: '' })}
                error={!!name.error}
                errorText={name.error}
            />
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
            <Button
                mode="contained"
                onPress={onSignUpPressed}
                style={styles.loginbtn}
            >
                Sign Up
            </Button>
            <View style={styles.row}>
                <Text>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.link}>Login</Text>
                </TouchableOpacity>
            </View>
        </Background>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginTop: 4,
    },
    link: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    loginbtn: {
        marginTop: 24,
        backgroundColor: '#ffc808',
    },
});
