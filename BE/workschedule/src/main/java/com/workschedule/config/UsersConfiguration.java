package com.workschedule.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.ExpressionUrlAuthorizationConfigurer;
import org.springframework.security.config.annotation.web.configurers.FormLoginConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class UsersConfiguration {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            http.authorizeRequests((authorize) -> {
                ((ExpressionUrlAuthorizationConfigurer.AuthorizedUrl)
                        ((ExpressionUrlAuthorizationConfigurer.AuthorizedUrl)((ExpressionUrlAuthorizationConfigurer.AuthorizedUrl)((ExpressionUrlAuthorizationConfigurer.AuthorizedUrl)authorize.requestMatchers(HttpMethod.OPTIONS, new String[]{"/**"}))
                        .permitAll()
                        .requestMatchers(HttpMethod.POST))
                        .permitAll().requestMatchers(new String[]{"/*", "/*/*"}))
                        .permitAll()
                        .anyRequest())
                        .authenticated();
        }).formLogin((login) -> {
            ((FormLoginConfigurer)((FormLoginConfigurer)((FormLoginConfigurer)
                    login.
                            loginPage("/login").
                            usernameParameter("email").
                            passwordParameter("password").
                            loginProcessingUrl("/do-login")).
                    defaultSuccessUrl("/", true)).
                    failureUrl("/login?error=true")).
                    permitAll();
        }).logout((logout) -> {
            logout.logoutSuccessUrl("/login?logout")
                    .invalidateHttpSession(true)
                    .deleteCookies(new String[]{"JSESSIONID"})
                    .permitAll();
        }).rememberMe((remember) -> {
            remember.key("aaa");
        }).csrf(AbstractHttpConfigurer::disable);
        return (SecurityFilterChain) http.build();
    }

    public UsersConfiguration() {
    }
}
