package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.dto.request.CreateWithdrawalRequestDTO;
import com.enterprise.investmentanalytics.dto.response.DashboardMetrics;
import com.enterprise.investmentanalytics.dto.response.TransactionResponse;
import com.enterprise.investmentanalytics.dto.response.WithdrawalRequestDTO;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.security.JwtService;
import com.enterprise.investmentanalytics.service.AnalyticsService;
import com.enterprise.investmentanalytics.service.TransactionService;
import com.enterprise.investmentanalytics.service.WithdrawalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
public class ClientController {

    private final AnalyticsService analyticsService;
    private final TransactionService transactionService;
    private final WithdrawalService withdrawalService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetrics> getDashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(analyticsService.getClientDashboardMetrics(user));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponse>> getTransactions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(transactionService.getTransactionsByUserId(user.getId()));
    }

    @GetMapping("/analytics")
    public ResponseEntity<String> getAnalytics(@AuthenticationPrincipal User user) {
        // Return chart data. For now returning a placeholder or simple object.
        // Implementation provided later or aggregated in DashboardMetrics for
        // simplicity if small.
        return ResponseEntity.ok("Analytics data placeholder");
    }

    @PostMapping("/withdrawal-request")
    public ResponseEntity<Map<String, Object>> createWithdrawalRequest(
            @AuthenticationPrincipal User user,
            @RequestBody CreateWithdrawalRequestDTO request) {
        try {
            WithdrawalRequestDTO withdrawalRequest = withdrawalService.createWithdrawalRequest(
                    user.getId(),
                    request.getAmount());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Withdrawal request submitted successfully");
            response.put("request", withdrawalRequest);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/withdrawal-requests")
    public ResponseEntity<List<WithdrawalRequestDTO>> getMyWithdrawalRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(withdrawalService.getUserWithdrawalRequests(user.getId()));
    }
}
