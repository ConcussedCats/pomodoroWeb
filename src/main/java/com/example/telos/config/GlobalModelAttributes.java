// src/main/java/com/example/telos/config/GlobalModelAttributes.java
package com.example.telos.config;

import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
@AllArgsConstructor
public class GlobalModelAttributes {

    private final AppVersionConfig appVersionConfig;

    @ModelAttribute("appVersion")
    public String appVersion() {
        return appVersionConfig.getVersion();
    }
}
