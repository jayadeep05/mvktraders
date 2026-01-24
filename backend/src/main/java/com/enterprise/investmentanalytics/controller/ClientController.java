package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.dto.request.CreateWithdrawalRequestDTO;
import com.enterprise.investmentanalytics.dto.response.DashboardMetrics;
import com.enterprise.investmentanalytics.dto.response.DepositRequestDTO;
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
    private final com.enterprise.investmentanalytics.service.DepositService depositService;
    private final com.enterprise.investmentanalytics.repository.MonthlyProfitHistoryRepository monthlyProfitHistoryRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetrics> getDashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(analyticsService.getClientDashboardMetrics(user));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponse>> getTransactions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(transactionService.getTransactionsByUserId(user.getId()));
    }

    @GetMapping("/profit/history")
    public ResponseEntity<List<com.enterprise.investmentanalytics.dto.response.ProfitHistoryDTO>> getProfitHistory(
            @AuthenticationPrincipal User user) {
        List<com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory> profitHistory = monthlyProfitHistoryRepository
                .findByUserIdOrderByYearDescMonthDesc(user.getId());

        List<com.enterprise.investmentanalytics.dto.response.ProfitHistoryDTO> dtoList = profitHistory.stream()
                .map(history -> com.enterprise.investmentanalytics.dto.response.ProfitHistoryDTO.builder()
                        .month(history.getMonth())
                        .year(history.getYear())
                        .profitAmount(history.getProfitAmount())
                        .profitPercentage(history.getProfitPercentage())
                        .calculatedAt(history.getCalculatedAt())
                        .openingBalance(history.getOpeningBalance())
                        .closingBalance(history.getClosingBalance())
                        .profitMode(history.getProfitMode())
                        .isProrated(history.isProrated())
                        .build())
                .toList();

        return ResponseEntity.ok(dtoList);
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

    private final com.enterprise.investmentanalytics.service.S3Service s3Service;

    @PostMapping(value = "/deposit-request", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> createDepositRequestMultipart(
            @AuthenticationPrincipal User user,
            @RequestParam("amount") java.math.BigDecimal amount,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("screenshot") org.springframework.web.multipart.MultipartFile screenshot) {
        try {
            // Upload to S3
            String s3Key = s3Service.uploadFile(screenshot, "deposits");

            DepositRequestDTO depositRequest = depositService.createDepositRequest(
                    user.getId(),
                    amount,
                    s3Key,
                    note);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Deposit request submitted successfully");
            response.put("request", depositRequest);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping(value = "/deposit-request", consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> createDepositRequestJson(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> request) {
        try {
            java.math.BigDecimal amount = new java.math.BigDecimal(request.get("amount").toString());
            String note = (String) request.get("note");

            DepositRequestDTO depositRequest = depositService.createDepositRequest(
                    user.getId(),
                    amount,
                    null,
                    note);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Deposit request submitted successfully");
            response.put("request", depositRequest);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Invalid request: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/deposit-requests")
    public ResponseEntity<List<DepositRequestDTO>> getMyDepositRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(depositService.getUserDepositRequests(user.getId()));
    }
}
