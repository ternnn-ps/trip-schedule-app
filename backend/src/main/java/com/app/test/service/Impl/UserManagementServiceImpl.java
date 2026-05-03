package com.app.test.service.Impl;

import com.app.test.beans.dto.request.UserRequest;
import com.app.test.beans.dto.request.UserLocationRequest;
import com.app.test.beans.dto.response.PageResponse;
import com.app.test.beans.dto.response.UserResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.model.MsUser;
import com.app.test.repository.MsUserRepository;
import com.app.test.service.UserManagementService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Log4j2
@Service
public class UserManagementServiceImpl implements UserManagementService {

    private static final Set<String> SORT_FIELDS = new HashSet<>(
            Arrays.asList("userId", "userName", "userFullName", "email", "phone", "website")
    );

    @Autowired
    private MsUserRepository msUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public ResponseModelDto<PageResponse<UserResponse>> search(
            String keyword,
            int page,
            int size,
            List<String> sort
    ) {

        try {
            Pageable pageable = createPageable(page, size, sort);
            String normalizedKeyword = normalize(keyword);
            Page<MsUser> resultPage = msUserRepository.searchActiveUsers(normalizedKeyword, 'A', pageable);

            List<UserResponse> responseList = resultPage.getContent()
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());

            PageResponse<UserResponse> pageResponse = new PageResponse<>();
            pageResponse.setContent(responseList);
            pageResponse.setPage(resultPage.getNumber());
            pageResponse.setSize(resultPage.getSize());
            pageResponse.setTotalElements(resultPage.getTotalElements());
            pageResponse.setTotalPages(resultPage.getTotalPages());

            return new ResponseModelDto<>("Success", pageResponse, true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<UserResponse> create(UserRequest request) {

        try {
            String validationMessage = validateRequest(request);

            if (validationMessage != null) {
                return new ResponseModelDto<>(
                        "Failed",
                        validationMessage,
                        null,
                        false
                );
            }

            if (msUserRepository.existsByUserNameIgnoreCaseAndRecordStatus(request.getUserName().trim(), 'A')) {
                return new ResponseModelDto<>(
                        "Failed",
                        "Duplicate User Name",
                        null,
                        false
                );
            }

            MsUser entity = new MsUser();
            applyRequest(entity, request);

            entity.setCreatedBy("Admin");
            entity.setCreatedDate(new Date());
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());
            entity.setRecordStatus('A');

            entity = msUserRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<UserResponse> update(UserRequest request) {

        try {
            String validationMessage = validateRequest(request);

            if (validationMessage != null) {
                return new ResponseModelDto<>(
                        "Failed",
                        validationMessage,
                        null,
                        false
                );
            }

            MsUser entity = msUserRepository.findById(request.getUserId())
                    .orElse(null);

            if (entity == null || entity.getRecordStatus() != 'A') {
                return new ResponseModelDto<>(
                        "Failed",
                        "Record not found",
                        null,
                        false
                );
            }

            if (msUserRepository.existsByUserNameIgnoreCaseAndUserIdNotAndRecordStatus(
                    request.getUserName().trim(),
                    request.getUserId(),
                    'A'
            )) {
                return new ResponseModelDto<>(
                        "Failed",
                        "Duplicate User Name",
                        null,
                        false
                );
            }

            applyRequest(entity, request);

            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            entity = msUserRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<UserResponse> updateLocation(UserLocationRequest request) {
        try {
            if (request == null || request.getUserId() == null) {
                return new ResponseModelDto<>(
                        "Failed",
                        "User ID is required",
                        null,
                        false
                );
            }

            if (!isValidCoordinate(request.getLatitude(), -90, 90)
                    || !isValidCoordinate(request.getLongitude(), -180, 180)) {
                return new ResponseModelDto<>(
                        "Failed",
                        "Valid latitude and longitude are required",
                        null,
                        false
                );
            }

            MsUser entity = msUserRepository.findById(request.getUserId())
                    .orElse(null);

            if (entity == null || entity.getRecordStatus() != 'A') {
                return new ResponseModelDto<>(
                        "Failed",
                        "Record not found",
                        null,
                        false
                );
            }

            entity.setLastLatitude(request.getLatitude());
            entity.setLastLongitude(request.getLongitude());
            entity.setLastLocationUpdatedAt(new Date());
            entity.setUpdatedBy("Location");
            entity.setUpdatedDate(new Date());

            entity = msUserRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<UserResponse> delete(UserRequest request) {

        try {

            MsUser entity = msUserRepository.findById(request.getUserId())
                    .orElse(null);

            if (entity == null) {
                return new ResponseModelDto<>(
                        "Failed",
                        "User not found",
                        null,
                        false
                );
            }

            entity.setRecordStatus('D');
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            entity = msUserRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    private Pageable createPageable(int page, int size, List<String> sort) {
        int safePage = Math.max(page, 0);
        int safeSize = size > 0 ? Math.min(size, 100) : 10;
        List<Sort.Order> orders = new ArrayList<>();

        if (sort != null) {
            for (String sortParam : sort) {
                if (sortParam == null || sortParam.trim().isEmpty()) {
                    continue;
                }

                String[] parts = sortParam.split(",");
                String field = parts[0].trim();

                if (!SORT_FIELDS.contains(field)) {
                    continue;
                }

                Sort.Direction direction = parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())
                        ? Sort.Direction.DESC
                        : Sort.Direction.ASC;
                orders.add(new Sort.Order(direction, field));
            }
        }

        if (orders.isEmpty()) {
            return PageRequest.of(safePage, safeSize);
        }

        return PageRequest.of(safePage, safeSize, Sort.by(orders));
    }

    private String validateRequest(UserRequest request) {
        if (request == null) {
            return "Request body is required";
        }

        if (!hasText(request.getUserName())) {
            return "Username is required";
        }

        if (!hasText(request.getUserFullName())) {
            return "Full Name is required";
        }

        if (!hasText(request.getEmail())) {
            return "E-mail is required";
        }

        if (hasText(request.getPassword()) && request.getPassword().trim().length() < 8) {
            return "Password must be at least 8 characters";
        }

        return null;
    }

    private void applyRequest(MsUser entity, UserRequest request) {
        entity.setUserName(request.getUserName().trim());
        entity.setUserFullName(request.getUserFullName().trim());
        entity.setEmail(request.getEmail().trim());
        entity.setPhone(normalize(request.getPhone()));
        entity.setWebsite(normalize(request.getWebsite()));

        if (hasText(request.getPassword())) {
            entity.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }
    }

    private UserResponse mapToResponse(MsUser entity) {
        UserResponse res = new UserResponse();
        res.setUserId(entity.getUserId());
        res.setUserName(entity.getUserName());
        res.setUserFullName(entity.getUserFullName());
        res.setEmail(entity.getEmail());
        res.setPhone(entity.getPhone());
        res.setWebsite(entity.getWebsite());
        res.setLastLatitude(entity.getLastLatitude());
        res.setLastLongitude(entity.getLastLongitude());
        res.setLastLocationUpdatedAt(entity.getLastLocationUpdatedAt());
        return res;
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean isValidCoordinate(Double value, int min, int max) {
        return value != null && Double.isFinite(value) && value >= min && value <= max;
    }
}
