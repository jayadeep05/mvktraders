package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.model.entity.DeleteRequest;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.DeleteRequestStatus;
import com.enterprise.investmentanalytics.model.enums.Role;
import com.enterprise.investmentanalytics.repository.DeleteRequestRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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
    public void deleteClient(UUID clientId, User admin, String password) {
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
    public void approveDeleteRequest(UUID requestId, User admin, String password) {
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
    public void rejectDeleteRequest(UUID requestId, User admin) {
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

    private void validateAdminPassword(User adminPrincipal, String password) {
        User admin = userRepository.findById(adminPrincipal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        if (!passwordEncoder.matches(password, admin.getPassword())) {
            throw new IllegalArgumentException("Invalid password");
        }
    }

    private void performDelete(UUID userId, String deletedBy) {
        User user = userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found or already deleted"));

        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setDeletedBy(deletedBy);
        // We might want to set status to INACTIVE or similar if that exists,
        // but soft delete flag is usually enough.
        userRepository.save(user);
    }
}
