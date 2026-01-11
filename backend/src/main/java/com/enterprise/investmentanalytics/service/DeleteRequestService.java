package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.model.entity.DeleteRequest;
import com.enterprise.investmentanalytics.model.entity.DepositRequest; // New
import com.enterprise.investmentanalytics.model.entity.PayoutRequest; // New
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.entity.WithdrawalRequest; // New
import com.enterprise.investmentanalytics.model.enums.*;
import com.enterprise.investmentanalytics.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeleteRequestService {

    private final DeleteRequestRepository deleteRequestRepository;
    private final UserRepository userRepository;
    private final DepositRequestRepository depositRequestRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final TransactionRepository transactionRepository;
    private final PortfolioRepository portfolioRepository;
    private final MonthlyProfitHistoryRepository monthlyProfitHistoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public DeleteRequest requestClientDeletion(User mediator, UUID clientId, String reason) {
        User client = userRepository.findByIdAndIsDeletedFalse(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));

        if (client.getRole() != Role.CLIENT) { // direct comparison for enum
            throw new IllegalArgumentException("Target is not a client");
        }

        // Check ownership
        if (client.getMediator() == null || !client.getMediator().getId().equals(mediator.getId())) {
            throw new IllegalArgumentException("You can only request deletion for your own clients");
        }

        DeleteRequest request = DeleteRequest.builder()
                .entityId(clientId)
                .entityType("CLIENT")
                .requestedBy(mediator)
                .status(DeleteRequestStatus.PENDING)
                .reason(reason)
                .build();

        return deleteRequestRepository.save(request);
    }

    @Transactional
    public void deleteClient(@NonNull UUID clientId, User admin, String password) {
        validateAdminPassword(admin, password);
        performDelete(clientId, admin.getEmail());
    }

    @Transactional
    public void deleteMediator(UUID mediatorId, User admin, String password) {
        validateAdminPassword(admin, password);

        User mediator = userRepository.findByIdAndIsDeletedFalse(mediatorId)
                .orElseThrow(() -> new IllegalArgumentException("Mediator not found"));

        long activeClients = userRepository.countByMediatorAndIsDeletedFalse(mediator);
        if (activeClients > 0) {
            throw new IllegalStateException(
                    "Cannot delete mediator with active clients. Please delete or reassign clients first.");
        }

        performDelete(mediatorId, admin.getEmail());
    }

    @Transactional
    public void approveDeleteRequest(@NonNull UUID requestId, User admin, String password) {
        validateAdminPassword(admin, password);

        DeleteRequest request = deleteRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (request.getStatus() != DeleteRequestStatus.PENDING) {
            throw new IllegalStateException("Request is not pending");
        }

        performDelete(request.getEntityId(), admin.getEmail());

        request.setStatus(DeleteRequestStatus.APPROVED);
        deleteRequestRepository.save(request);
    }

    @Transactional
    public void rejectDeleteRequest(@NonNull UUID requestId, User admin) {
        DeleteRequest request = deleteRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        request.setStatus(DeleteRequestStatus.REJECTED);
        deleteRequestRepository.save(request);
    }

    public List<com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO> getAllPendingRequests() {
        return deleteRequestRepository.findByStatus(DeleteRequestStatus.PENDING).stream()
                .map(this::mapToDTO)
                .toList();
    }

    public List<com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO> getRequestsByMediator(
            UUID mediatorId) {
        return deleteRequestRepository.findByRequestedById(mediatorId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    private com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO mapToDTO(DeleteRequest request) {
        User targetUser = userRepository.findById(request.getEntityId()).orElse(null);

        com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO.UserSummaryDTO targetDTO = null;
        if (targetUser != null) {
            targetDTO = com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO.UserSummaryDTO.builder()
                    .id(targetUser.getId())
                    .name(targetUser.getName())
                    .email(targetUser.getEmail())
                    .role(targetUser.getRole().toString())
                    .build();
        }

        com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO.UserSummaryDTO requesterDTO = null;
        if (request.getRequestedBy() != null) {
            requesterDTO = com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO.UserSummaryDTO.builder()
                    .id(request.getRequestedBy().getId())
                    .name(request.getRequestedBy().getName())
                    .email(request.getRequestedBy().getEmail())
                    .role(request.getRequestedBy().getRole().toString())
                    .build();
        }

        return com.enterprise.investmentanalytics.dto.response.DeleteRequestDTO.builder()
                .id(request.getId())
                .reason(request.getReason())
                .status(request.getStatus().toString())
                .createdAt(request.getCreatedAt())
                .targetUser(targetDTO)
                .requester(requesterDTO)
                .build();
    }

    @Transactional
    public void deactivateUser(@NonNull UUID userId, String deactivatedBy) {
        performDelete(userId, deactivatedBy);
    }

    private void validateAdminPassword(User adminPrincipal, String password) {
        User admin = userRepository.findById(adminPrincipal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        if (!passwordEncoder.matches(password, admin.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }
    }

    private void performDelete(@NonNull UUID userId, String deletedBy) {
        System.out.println("Beginning deactivation for user ID: " + userId);

        // Find user regardless of deleted status to handle idempotency
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found (ID: " + userId + ")"));

        if (user.isDeleted()) {
            System.out.println("User " + userId + " is already deactivated. Skipping.");
            return;
        }

        System.out.println("Found user: " + user.getEmail() + " (Status: " + user.getStatus() + ")");

        // 1. Mark as Inactive and Deleted
        user.setStatus(UserStatus.INACTIVE);
        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setDeletedBy(deletedBy);
        userRepository.save(user);

        // 2. Cancel Pending Deposits
        // 2. Cancel Pending Deposits
        List<DepositRequest> deposits = depositRequestRepository.findByUserOrderByCreatedAtDesc(user);
        for (DepositRequest d : deposits) {
            if (d.getStatus() == RequestStatus.PENDING) {
                d.setStatus(RequestStatus.CANCELLED);
                d.setAdminNote("Cancelled due to user deactivation");
                depositRequestRepository.save(d);
            }
        }

        // 3. Cancel Pending Withdrawals
        List<WithdrawalRequest> withdrawals = withdrawalRequestRepository.findByUserOrderByCreatedAtDesc(user);
        for (WithdrawalRequest w : withdrawals) {
            if (w.getStatus() == WithdrawalStatus.PENDING) {
                w.setStatus(WithdrawalStatus.CANCELLED);
                w.setRejectionReason("Cancelled due to user deactivation");
                withdrawalRequestRepository.save(w);
            }
        }

        // 4. Cancel Pending Payouts
        List<PayoutRequest> payouts = payoutRequestRepository.findByUserOrderByCreatedAtDesc(user);
        for (PayoutRequest p : payouts) {
            if (p.getStatus() == WithdrawalStatus.PENDING) {
                p.setStatus(WithdrawalStatus.CANCELLED);
                p.setRejectionReason("Cancelled due to user deactivation");
                payoutRequestRepository.save(p);
            }
        }
    }

    @Transactional
    public void performPermanentDelete(@NonNull UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 1. Delete Transactions
        List<com.enterprise.investmentanalytics.model.entity.Transaction> transactions = transactionRepository
                .findByUserId(userId);
        if (transactions != null)
            transactionRepository.deleteAll(transactions);

        // 2. Delete Requests
        // 2. Delete Requests
        List<DepositRequest> deposits = depositRequestRepository.findByUserOrderByCreatedAtDesc(user);
        if (deposits != null)
            depositRequestRepository.deleteAll(deposits);

        List<WithdrawalRequest> withdrawals = withdrawalRequestRepository.findByUserOrderByCreatedAtDesc(user);
        if (withdrawals != null)
            withdrawalRequestRepository.deleteAll(withdrawals);

        List<PayoutRequest> payouts = payoutRequestRepository.findByUserOrderByCreatedAtDesc(user);
        if (payouts != null)
            payoutRequestRepository.deleteAll(payouts);

        // 3. Delete Portfolio & History
        portfolioRepository.findByUserId(userId).ifPresent(portfolioRepository::delete);

        List<com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory> history = monthlyProfitHistoryRepository
                .findByUserIdOrderByYearDescMonthDesc(userId);
        if (history != null)
            monthlyProfitHistoryRepository.deleteAll(history);

        // 4. Delete DeleteRequests targeting this user
        List<DeleteRequest> deleteRequests = deleteRequestRepository.findByEntityId(userId);
        if (deleteRequests != null)
            deleteRequestRepository.deleteAll(deleteRequests);

        // 5. Finally delete the User
        userRepository.delete(user);
    }
}
