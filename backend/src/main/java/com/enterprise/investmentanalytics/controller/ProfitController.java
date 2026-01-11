package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.service.GlobalConfigService;
import com.enterprise.investmentanalytics.service.ProfitCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/profit")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ProfitController {

    private final GlobalConfigService configService;
    private final ProfitCalculationService profitCalculationService;

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getAllConfigs() {
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    @PutMapping("/config")
    public ResponseEntity<Map<String, String>> updateConfig(@RequestBody Map<String, String> updates) {
        updates.forEach(configService::updateValue);
        return ResponseEntity.ok(configService.getAllConfigs());
    }

    @PostMapping("/calculate")
    public ResponseEntity<?> calculateProfit(@RequestParam int month, @RequestParam int year) {
        try {
            profitCalculationService.calculateMonthlyProfit(month, year);
            return ResponseEntity.ok(Map.of("message", "Profit calculation completed for " + month + "/" + year));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
