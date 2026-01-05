package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.service.PortfolioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping("/my")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<com.enterprise.investmentanalytics.dto.response.PortfolioDTO> getMyPortfolio() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return ResponseEntity.ok(portfolioService.getPortfolioDTOByEmail(email));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Portfolio>> getAllPortfolios() {
        return ResponseEntity.ok(portfolioService.getAllPortfolios());
    }
}
