package com.example.telos.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.security.Principal;

public class PostLoginRedirects {

    private static final String POST_LOGIN_REDIRECT_KEY = "POST_LOGIN_REDIRECT";
    private static final String DEFAULT_TARGET = "/user";

    private PostLoginRedirects() {
    }

    public static void saveTarget(HttpServletRequest request, String target) {
        if (!isAllowedTarget(target)) {
            return;
        }

        request.getSession(true).setAttribute(POST_LOGIN_REDIRECT_KEY, target);
    }

    public static void saveTargetForAnonymous(HttpServletRequest request, String target) {
        Principal principal = request.getUserPrincipal();
        if (!(principal instanceof Authentication authentication)
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            saveTarget(request, target);
        }
    }

    public static String consumeTarget(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return DEFAULT_TARGET;
        }

        Object target = session.getAttribute(POST_LOGIN_REDIRECT_KEY);
        session.removeAttribute(POST_LOGIN_REDIRECT_KEY);

        if (target instanceof String targetString && isAllowedTarget(targetString)) {
            return targetString;
        }

        return DEFAULT_TARGET;
    }

    private static boolean isAllowedTarget(String target) {
        return "/".equals(target)
                || "/about".equals(target)
                || "/helpus".equals(target)
                || "/productivity".equals(target)
                || "/user".equals(target);
    }
}
