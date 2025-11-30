package com.workschedule.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    // 会いたい
    @GetMapping("/hello")
    public String hello(){
        return "bye you";
    }
}
