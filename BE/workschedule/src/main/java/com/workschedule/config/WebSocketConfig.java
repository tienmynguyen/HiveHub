package com.workschedule.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // "/ws" là điểm kết nối ban đầu (Handshake)
        // setAllowedOriginPatterns("*") để cho phép React Native kết nối
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS(); // Hỗ trợ fallback
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // "/topic" là tiền tố để gửi tin nhắn TỪ server VỀ client
        registry.enableSimpleBroker("/topic");
        // "/app" là tiền tố để client gửi tin nhắn LÊN server
        registry.setApplicationDestinationPrefixes("/app");
    }
}