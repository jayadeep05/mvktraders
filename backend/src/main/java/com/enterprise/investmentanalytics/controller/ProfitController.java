package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.dto.request.ProfitConfigRequest;
import com.enterprise.investmentanalytics.dto.response.ProfitHistoryResponse;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.service.ProfitCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ProfitController {

    private final ProfitCalculationService profitService;

    // Admin Endpoints

    @PostMapping("/api/admin/profit/calculate-all")
    public ResponseEntity<?> calculateAllProfits(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        LocalDate now = LocalDate.now();
        int m = (month != null) ? month : now.getMonthValue();
        int y = (year != null) ? year : now.getYear();

        log.info("Admin triggering batch profit calculation for {}/{}", m, y);
        profitService.calculateAllProfits(m, y, true);

        return ResponseEntity.ok(Map.of("message", "Batch profit calculation triggered", "month", m, "year", y));
    }

    @PostMapping("/api/admin/profit/calculate/{userId}")
    public ResponseEntity<?> calculateProfitForUser(
            @PathVariable UUID userId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        LocalDate now = LocalDate.now();
        int m = (month != null) ? month : now.getMonthValue();
        int y = (year != null) ? year : now.getYear();

        profitService.calculateProfitForUser(userId, m, y, true);

        return ResponseEntity.ok(Map.of("message", "Profit calculated for user", "userId", userId));
    }

    @PutMapping("/api/admin/profit/config/{userId}")
    public ResponseEntity<?> updateProfitConfig(
            @PathVariable UUID userId,
            @RequestBody ProfitConfigRequest request) {
        profitService.updateProfitConfig(userId, request);
        return ResponseEntity.ok(Map.of("message", "Profit configuration updated"));
    }

    @GetMapping("/api/admin/profit/history/{userId}")
    public ResponseEntity<List<ProfitHistoryResponse>> getHistoryForUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(profitService.getHistory(userId));
    }

    // Client Endpoints

    @GetMapping("/api/client/profit/history")
    public ResponseEntity<List<ProfitHistoryResponse>> getMyHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(profitService.getHistory(user.getId()));
    }
}
