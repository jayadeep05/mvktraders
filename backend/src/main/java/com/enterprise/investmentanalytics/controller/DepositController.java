package com.enterprise.investmentanalytics.controller;

import com.enterprise.investmentanalytics.dto.request.DepositRequestDTO;
import com.enterprise.investmentanalytics.model.entity.DepositRequest;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.DepositStatus;
import com.enterprise.investmentanalytics.service.DepositService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DepositController {

    private final DepositService depositService;

    // Client Endpoints
    @PostMapping("/client/deposit-request")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<?> createRequest(@AuthenticationPrincipal User user, @RequestBody DepositRequestDTO dto) {
        DepositRequest request = depositService.createRequest(user.getId(), dto);
        return ResponseEntity.ok(Map.of("success", true, "request", request));
    }

    @GetMapping("/client/deposit-requests")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<List<DepositRequest>> getMyRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(depositService.getRequestsByUser(user.getId()));
    }

    // Admin Endpoints
    @GetMapping("/admin/deposit-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DepositRequest>> getAllRequests(@RequestParam(required = false) DepositStatus status) {
        if (status != null) {
            return ResponseEntity.ok(depositService.getRequestsByStatus(status));
        }
        return ResponseEntity.ok(depositService.getAllRequests());
    }

    @PostMapping("/admin/deposit-request/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createRequestForUser(@PathVariable UUID userId, @RequestBody DepositRequestDTO dto) {
        DepositRequest request = depositService.createRequest(userId, dto);
        return ResponseEntity.ok(Map.of("success", true, "request", request));
    }

    @PostMapping("/admin/deposit-requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveRequest(@PathVariable UUID id, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin) {
        String paymentMode = body.getOrDefault("paymentMode", "Other");
        DepositRequest request = depositService.approveRequest(id, admin.getUserId(), paymentMode);
        return ResponseEntity.ok(Map.of("success", true, "request", request));
    }

    @PostMapping("/admin/deposit-requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectRequest(@PathVariable UUID id, @AuthenticationPrincipal User admin) {
        DepositRequest request = depositService.rejectRequest(id, admin.getUserId());
        return ResponseEntity.ok(Map.of("success", true, "request", request));
    }
}
